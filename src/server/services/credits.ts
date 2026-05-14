/**
 * Credits management service for the Next.js app server (Vercel runtime).
 *
 * Uses atomic Postgres `UPDATE … RETURNING` via `@repo/db/credits`:
 *
 *   UPDATE users
 *      SET credits = credits - $amount
 *    WHERE uid = $uid AND credits >= $amount
 *   RETURNING credits;
 *
 * The atomicity guarantee is unchanged — Postgres serializes concurrent
 * UPDATEs against the same row via implicit row-level locks. See
 * `packages/db/src/credits.ts` and the two test files in `packages/db/test/`
 * for the full proof:
 *   - `credits-atomic-deduct.test.ts` — raw SQL pattern, includes
 *     concurrent race (two `Promise.all`'d UPDATEs against the same balance,
 *     exactly one wins).
 *   - `credits-primitives.test.ts`   — Drizzle wrappers, asserts the
 *     `success / insufficient / no_user` discrimination.
 *
 * ## External contract
 *
 * The four exported functions keep stable error strings for callers.
 *
 * ## Input validation
 *
 * `zod` validates `uid` and amounts; messages stay stable for callers
 * (e.g. `'Invalid user ID'`, `'Amount must be positive'`).
 */

import { getDbHttp } from '@repo/db';
import {
  addCredits,
  atomicDeductCredits,
  setCredits,
  type CreditUpdateOutcome,
} from '@repo/db/credits';
import { z } from 'zod';

import * as logger from '@/server/lib/logger';

/** Result of a credit operation (stable wire shape for handlers). */
export interface CreditOperationResult {
  success: boolean;
  newBalance?: number;
  error?: string;
}

/** Options for credit operations. */
export interface CreditOperationOptions {
  /**
   * Whether to include the post-operation balance in the result.
   *
   * When false, omit `newBalance` from the result object even though the SQL
   * path could always compute it (`RETURNING credits`). Preserves older
   * call-site expectations.
   */
  returnBalance?: boolean;
}

// ---------------------------------------------------------------------------
// Zod input gates
// ---------------------------------------------------------------------------

const UidSchema = z.string().trim().min(1, { message: 'Invalid user ID' });

const PositiveAmountSchema = z
  .number()
  .int({ message: 'Amount must be positive' })
  .positive({ message: 'Amount must be positive' });

const NonNegativeAmountSchema = z
  .number()
  .int({ message: 'Amount must be non-negative integer' })
  .nonnegative({ message: 'Amount must be non-negative integer' });

function validateForChange(
  uid: string,
  amount: number,
): { ok: true; uid: string; amount: number } | { ok: false; error: string } {
  const uidParsed = UidSchema.safeParse(uid);
  if (!uidParsed.success) {
    return {
      ok: false,
      error: uidParsed.error.issues[0]?.message ?? 'Invalid user ID',
    };
  }
  const amountParsed = PositiveAmountSchema.safeParse(amount);
  if (!amountParsed.success) {
    return {
      ok: false,
      error: amountParsed.error.issues[0]?.message ?? 'Amount must be positive',
    };
  }
  return { ok: true, uid: uidParsed.data, amount: amountParsed.data };
}

// ---------------------------------------------------------------------------
// Outcome mapping (CreditUpdateOutcome → CreditOperationResult)
// ---------------------------------------------------------------------------

function mapDeductOutcome(
  outcome: CreditUpdateOutcome,
  amount: number,
  options: CreditOperationOptions,
): CreditOperationResult {
  switch (outcome.outcome) {
    case 'success':
      return {
        success: true,
        newBalance: options.returnBalance ? outcome.credits : undefined,
      };
    case 'insufficient':
      return {
        success: false,
        error: `Insufficient credits. Required: ${amount}`,
      };
    case 'no_user':
      return { success: false, error: 'User not found' };
  }
}

function mapAddOutcome(
  outcome: CreditUpdateOutcome,
  options: CreditOperationOptions,
): CreditOperationResult {
  switch (outcome.outcome) {
    case 'success':
      return {
        success: true,
        newBalance: options.returnBalance ? outcome.credits : undefined,
      };
    case 'no_user':
      return { success: false, error: 'User not found' };
    case 'insufficient':
      // addCredits never emits this — the type-narrow is exhaustive only
      // because all three primitives share the union. Treat as defensive.
      return { success: false, error: 'Failed to add credits' };
  }
}

function mapDbError(
  error: unknown,
  op: 'deduct' | 'add' | 'set',
): CreditOperationResult {
  const errorMessage = error instanceof Error ? error.message : String(error);

  // Defense-in-depth: if a buggy caller bypasses the WHERE guard (or the
  // CHECK fires on `setCredits(uid, negative)`), surface as "Insufficient".
  if (
    op === 'deduct' &&
    /users_credits_non_negative|check constraint/i.test(errorMessage)
  ) {
    return { success: false, error: 'Insufficient credits' };
  }

  return {
    success: false,
    error: errorMessage || `Unknown error during credit ${op}`,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Deduct credits from a user account atomically.
 *
 * @param uid Authenticated user id (`users.uid`).
 * @param amount Positive integer to deduct.
 * @param options.returnBalance Include the post-deduct balance in the result.
 *
 * @example
 * const result = await deductUserCredits(uid, 10);
 * if (!result.success) return buildQuotaExceeded(...);
 *
 * @example
 * const result = await deductUserCredits(uid, 10, { returnBalance: true });
 * console.log(result.newBalance);
 */
export async function deductUserCredits(
  uid: string,
  amount: number,
  options: CreditOperationOptions = {},
): Promise<CreditOperationResult> {
  const validated = validateForChange(uid, amount);
  if (!validated.ok) return { success: false, error: validated.error };

  try {
    const outcome = await atomicDeductCredits(
      getDbHttp(),
      validated.uid,
      validated.amount,
    );
    const result = mapDeductOutcome(outcome, validated.amount, options);
    if (result.success) {
      logger.info(
        `Deducted ${validated.amount} credits for user ${validated.uid}` +
          (result.newBalance !== undefined
            ? `, new balance: ${result.newBalance}`
            : ''),
      );
    }
    return result;
  } catch (error) {
    logger.error(`Error deducting credits for user ${validated.uid}:`, error);
    return mapDbError(error, 'deduct');
  }
}

/**
 * Add credits to a user account atomically.
 *
 * @param uid User UID.
 * @param amount Positive integer to add.
 * @param options.returnBalance Include the post-add balance in the result.
 */
export async function addUserCredits(
  uid: string,
  amount: number,
  options: CreditOperationOptions = {},
): Promise<CreditOperationResult> {
  const validated = validateForChange(uid, amount);
  if (!validated.ok) return { success: false, error: validated.error };

  try {
    const outcome = await addCredits(
      getDbHttp(),
      validated.uid,
      validated.amount,
    );
    const result = mapAddOutcome(outcome, options);
    if (result.success) {
      logger.info(
        `Added ${validated.amount} credits for user ${validated.uid}` +
          (result.newBalance !== undefined
            ? `, new balance: ${result.newBalance}`
            : ''),
      );
    }
    return result;
  } catch (error) {
    logger.error(`Error adding credits for user ${validated.uid}:`, error);
    return mapDbError(error, 'add');
  }
}

/**
 * Refund credits to a user (alias for `addUserCredits` with refund-tagged
 * logging).
 */
export async function refundUserCredits(
  uid: string,
  amount: number,
  options: CreditOperationOptions = {},
): Promise<CreditOperationResult> {
  const result = await addUserCredits(uid, amount, options);
  if (result.success) {
    logger.info(`Refunded ${amount} credits to user ${uid}`);
  }
  return result;
}

/**
 * Reset a user's credits to an exact amount (SET, not ADD).
 *
 * Used for subscription renewals and plan upgrades to ensure credits snap
 * to the plan's monthly allocation rather than accumulate. NOT atomic
 * w.r.t. concurrent deducts — by design.
 *
 * Returns `void` and swallows errors (including missing user), matching
 * subscription reset call sites; failures are logged at warn/error for ops.
 *
 * @param uid User UID.
 * @param amount Non-negative integer to set the balance to.
 */
export async function resetUserCredits(
  uid: string,
  amount: number,
): Promise<void> {
  const uidParsed = UidSchema.safeParse(uid);
  if (!uidParsed.success) {
    logger.warn(
      `[credits.reset] Invalid uid, skipping reset: ${uidParsed.error.issues[0]?.message}`,
    );
    return;
  }
  const amountParsed = NonNegativeAmountSchema.safeParse(amount);
  if (!amountParsed.success) {
    logger.warn(
      `[credits.reset] Invalid amount for ${uidParsed.data}: ${amountParsed.error.issues[0]?.message}`,
    );
    return;
  }

  try {
    const outcome = await setCredits(
      getDbHttp(),
      uidParsed.data,
      amountParsed.data,
    );
    if (outcome.outcome === 'no_user') {
      logger.warn(
        `[credits.reset] User not found for ${uidParsed.data}, no rows updated`,
      );
      return;
    }
    logger.info(
      `Reset credits to ${amountParsed.data} for user ${uidParsed.data}`,
    );
  } catch (error) {
    logger.error(
      `[credits.reset] Error resetting credits for ${uidParsed.data}:`,
      error,
    );
    // Intentionally swallow (reset must not throw); logged above.
  }
}
