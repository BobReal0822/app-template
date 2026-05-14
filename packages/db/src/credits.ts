/**
 * Credit-balance SQL primitives.
 *
 * Three operations on the `users.credits` column:
 *   - `atomicDeductCredits` — `UPDATE … SET credits = credits - $n WHERE uid = $uid AND credits >= $n RETURNING credits`
 *   - `addCredits`          — `UPDATE … SET credits = credits + $n WHERE uid = $uid RETURNING credits`
 *   - `setCredits`          — `UPDATE … SET credits = $n            WHERE uid = $uid RETURNING credits`
 *
 * All three return a discriminated `CreditUpdateOutcome` so the caller can
 * distinguish "user not found" from "insufficient credits" without an extra
 * round-trip or JSON envelope parsing.
 *
 * ## Atomicity guarantee
 *
 * Postgres serializes concurrent UPDATEs against the same row via implicit
 * row-level locks. Two parallel `atomicDeductCredits(uid, 6)` calls against
 * a balance of 10 will:
 *   1. Both read the same row image initially.
 *   2. The first UPDATE acquires the row lock, evaluates `credits >= 6`
 *      (true → 10), writes 4, commits, releases lock.
 *   3. The second UPDATE blocks on the lock; once granted, re-evaluates
 *      `credits >= 6` against the new image (false → 4), updates 0 rows,
 *      returns `{ outcome: 'insufficient', credits: 4 }`.
 *
 * This is exhaustively tested by `packages/db/test/credits-atomic-deduct.test.ts`
 * (six cases including the concurrent race) and the Drizzle-emitted SQL
 * round-tripped here is asserted by `packages/db/test/credits-primitives.test.ts`.
 *
 * ## Database-level backstop
 *
 * The `users` table has a CHECK constraint `credits >= 0`. Even a buggy
 * caller that forgets the `credits >= $amount` guard will fail with a check
 * violation rather than persist a negative balance. Tested in
 * `credits-atomic-deduct.test.ts` ("CHECK constraint backstop").
 *
 * ## Why HTTP driver works here
 *
 * Each primitive is a *single* statement (the disambiguation SELECT in
 * `atomicDeductCredits` is logically separate — the UPDATE has already
 * committed if it fired). The HTTP driver's auto-commit-per-statement
 * model is therefore a strict superset of what we need. A future
 * "deduct then debit a credits_grants row in the same txn" would force us
 * to switch to `getDbTransaction()`; nothing currently does that.
 */

import { and, eq, gte, sql } from 'drizzle-orm';

import { users } from './schema';

import type { DbHttp } from './client';

/**
 * Outcome of a credit balance update, discriminated by `outcome`.
 *
 * Why a union instead of `number | null`:
 *   - `success` → returns the post-update balance for caller logging / UI.
 *   - `insufficient` → only emitted by `atomicDeductCredits`; carries the
 *     *current* balance so the caller can report shortfall (e.g.
 *     "you need 10 more credits"). NOT mutated.
 *   - `no_user` → user row missing. Caller's responsibility to decide
 *     whether to upsert + retry or surface as a 404.
 */
export type CreditUpdateOutcome =
  | { outcome: 'success'; credits: number }
  | { outcome: 'insufficient'; credits: number }
  | { outcome: 'no_user'; credits: null };

/**
 * Atomically deduct `amount` credits from `uid`'s balance.
 *
 * Emits exactly:
 *   UPDATE users
 *      SET credits = credits - $amount
 *    WHERE uid = $uid AND credits >= $amount
 *   RETURNING credits;
 *
 * On 0 affected rows, performs ONE follow-up SELECT to disambiguate
 * `insufficient` from `no_user`.
 *
 * Caller MUST validate `amount > 0` and integer before invocation — passing
 * 0 or a negative value would either no-op or *increase* the balance.
 */
export async function atomicDeductCredits(
  db: DbHttp,
  uid: string,
  amount: number
): Promise<CreditUpdateOutcome> {
  const updated = await db
    .update(users)
    .set({ credits: sql`${users.credits} - ${amount}` })
    .where(and(eq(users.uid, uid), gte(users.credits, amount)))
    .returning({ credits: users.credits });

  if (updated.length > 0) {
    return { outcome: 'success', credits: updated[0]!.credits };
  }

  // Disambiguate failure mode. Race window: if a concurrent INSERT or DELETE
  // commits between the UPDATE and this SELECT, we may report the *latest*
  // user state. That is consistent with what a caller-initiated retry would
  // observe immediately afterward — no inconsistency for the user.
  const [row] = await db
    .select({ credits: users.credits })
    .from(users)
    .where(eq(users.uid, uid));
  if (!row) return { outcome: 'no_user', credits: null };
  return { outcome: 'insufficient', credits: row.credits };
}

/**
 * Atomically add `amount` credits to `uid`'s balance.
 *
 * Emits exactly:
 *   UPDATE users
 *      SET credits = credits + $amount
 *    WHERE uid = $uid
 *   RETURNING credits;
 *
 * No "insufficient" path — addition can only fail if the user row is
 * missing (returns `{ outcome: 'no_user' }`).
 *
 * Caller MUST validate `amount > 0` — passing a negative value would
 * silently turn this into an unguarded deduct.
 */
export async function addCredits(
  db: DbHttp,
  uid: string,
  amount: number
): Promise<CreditUpdateOutcome> {
  const updated = await db
    .update(users)
    .set({ credits: sql`${users.credits} + ${amount}` })
    .where(eq(users.uid, uid))
    .returning({ credits: users.credits });

  if (updated.length > 0) {
    return { outcome: 'success', credits: updated[0]!.credits };
  }
  return { outcome: 'no_user', credits: null };
}

/**
 * Set `uid`'s credit balance to exactly `amount` (SET, not ADD).
 *
 * Used for subscription renewals where the credit balance should snap to
 * the plan's monthly allocation rather than accumulate. NOT atomic w.r.t.
 * concurrent deducts — by design. The use case is "user paid an invoice;
 * reset their balance to plan_credits", which intentionally clobbers any
 * mid-month grants or refunds.
 *
 * Emits exactly:
 *   UPDATE users
 *      SET credits = $amount
 *    WHERE uid = $uid
 *   RETURNING credits;
 *
 * Caller MUST validate `amount >= 0` — passing a negative value triggers
 * the `users_credits_non_negative` CHECK constraint and the UPDATE throws.
 */
export async function setCredits(
  db: DbHttp,
  uid: string,
  amount: number
): Promise<CreditUpdateOutcome> {
  const updated = await db
    .update(users)
    .set({ credits: amount })
    .where(eq(users.uid, uid))
    .returning({ credits: users.credits });

  if (updated.length > 0) {
    return { outcome: 'success', credits: updated[0]!.credits };
  }
  return { outcome: 'no_user', credits: null };
}
