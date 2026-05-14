/**
 * Billing — drizzle helpers for `users` plan/customer columns and
 * `credit_grants` ledger writes.
 *
 * Centralizes partial-update semantics ("field absent preserves column",
 * explicit `null` wipes). Drizzle's `.set({ a: undefined })` is unstable across
 * builders, so callers build a payload of explicit keys and we forward it
 * verbatim.
 *
 * `INSERT ... ON CONFLICT (id) DO NOTHING` replaces the prior pattern of
 * `try insertCreditGrant + catch isDuplicateKeyError`; callers branch on
 * the boolean `inserted` flag instead of decoding driver-specific errors.
 *
 * `updated_at` is bumped by the `bump_updated_at_*` trigger; app code does not set it.
 */


import { getDbHttp } from '@repo/db';
import { creditGrants, users } from '@repo/db/schema';
import { eq } from 'drizzle-orm';

// ---------------------------------------------------------------------------
// users — Stripe customer cache (read + lazy write-back)
// ---------------------------------------------------------------------------

export async function getUserStripeCustomerIdRow(
  uid: string,
): Promise<{ stripeCustomerId: string | null } | null> {
  const db = getDbHttp();
  const rows = await db
    .select({ stripeCustomerId: users.stripeCustomerId })
    .from(users)
    .where(eq(users.uid, uid))
    .limit(1);
  return rows[0] ?? null;
}

export async function setUserStripeCustomerId(
  uid: string,
  stripeCustomerId: string,
): Promise<void> {
  const db = getDbHttp();
  await db.update(users).set({ stripeCustomerId }).where(eq(users.uid, uid));
}

// ---------------------------------------------------------------------------
// users — billing sync snapshot used by webhook handlers
// ---------------------------------------------------------------------------

export interface BillingSyncRow {
  plan: string;
  planCredits: number;
  nextYearlyCreditGrantAt: Date | null;
  yearlyCreditGrantAnchorDay: number | null;
}

export async function getUserBillingSyncState(
  uid: string,
): Promise<BillingSyncRow | null> {
  const db = getDbHttp();
  const rows = await db
    .select({
      plan: users.plan,
      planCredits: users.planCredits,
      nextYearlyCreditGrantAt: users.nextYearlyCreditGrantAt,
      yearlyCreditGrantAnchorDay: users.yearlyCreditGrantAnchorDay,
    })
    .from(users)
    .where(eq(users.uid, uid))
    .limit(1);
  return rows[0] ?? null;
}

// ---------------------------------------------------------------------------
// users — plan / cycle / cursors partial update
// ---------------------------------------------------------------------------

/**
 * Inputs for `updateUserPlanFields`. All fields are optional except `uid`;
 * only keys explicitly present on the input object are written. Pass
 * `null` to wipe a column to NULL.
 *
 * Date fields accept either a `Date` (preferred for new code) or an ISO
 * string (preserved for the in-flight callers that still hand us strings).
 */
export interface UpdateUserPlanInput {
  uid: string;
  plan?: string;
  planCredits?: number;
  planExpiredAt?: Date | string | null;
  cancelAtPeriodEnd?: boolean;
  subscriptionBillingCycle?: string | null;
  stripeSubscriptionId?: string | null;
  nextYearlyCreditGrantAt?: Date | string | null;
  yearlyCreditGrantAnchorDay?: number | null;
}

type UserPlanSet = Partial<{
  plan: string;
  planCredits: number;
  planExpiredAt: Date | null;
  cancelAtPeriodEnd: boolean;
  subscriptionBillingCycle: string | null;
  stripeSubscriptionId: string | null;
  nextYearlyCreditGrantAt: Date | null;
  yearlyCreditGrantAnchorDay: number | null;
}>;

function coerceDate(value: Date | string | null | undefined): Date | null {
  if (value == null) return null;
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function updateUserPlanFields(
  input: UpdateUserPlanInput,
): Promise<void> {
  const data: UserPlanSet = {};
  if ('plan' in input && input.plan !== undefined) data.plan = input.plan;
  if ('planCredits' in input && input.planCredits !== undefined) {
    data.planCredits = input.planCredits;
  }
  if ('planExpiredAt' in input) {
    data.planExpiredAt = coerceDate(input.planExpiredAt);
  }
  if ('cancelAtPeriodEnd' in input && input.cancelAtPeriodEnd !== undefined) {
    data.cancelAtPeriodEnd = input.cancelAtPeriodEnd;
  }
  if ('subscriptionBillingCycle' in input) {
    data.subscriptionBillingCycle = input.subscriptionBillingCycle ?? null;
  }
  if ('stripeSubscriptionId' in input) {
    data.stripeSubscriptionId = input.stripeSubscriptionId ?? null;
  }
  if ('nextYearlyCreditGrantAt' in input) {
    data.nextYearlyCreditGrantAt = coerceDate(input.nextYearlyCreditGrantAt);
  }
  if ('yearlyCreditGrantAnchorDay' in input) {
    data.yearlyCreditGrantAnchorDay = input.yearlyCreditGrantAnchorDay ?? null;
  }

  if (Object.keys(data).length === 0) return;

  const db = getDbHttp();
  await db.update(users).set(data).where(eq(users.uid, input.uid));
}

// ---------------------------------------------------------------------------
// users — free-tier monthly grant cursor
// ---------------------------------------------------------------------------

export async function updateUserNextFreeCreditGrantAt(
  uid: string,
  nextFreeCreditGrantAt: Date,
  freeCreditGrantAnchorDay: number,
): Promise<void> {
  const db = getDbHttp();
  await db
    .update(users)
    .set({
      nextFreeCreditGrantAt,
      freeCreditGrantAnchorDay,
    })
    .where(eq(users.uid, uid));
}

// ---------------------------------------------------------------------------
// credit_grants — idempotent insert + delete (rollback on reset failure)
// ---------------------------------------------------------------------------

export interface InsertCreditGrantInput {
  id: string;
  uid: string;
  subscriptionId: string;
  planCode: string;
  billingCycle: string;
  amount: number;
  grantMonth: string;
  triggerSource: string;
  triggerRef?: string | null;
}

export interface InsertCreditGrantResult {
  /** false when the PK already existed (idempotent retry) */
  inserted: boolean;
}

/**
 * `INSERT ... ON CONFLICT (id) DO NOTHING RETURNING id`. Returns
 * `{ inserted: false }` when the PK collides (idempotent webhook retry),
 * `{ inserted: true }` on a brand-new row.
 */
export async function insertCreditGrantIdempotent(
  input: InsertCreditGrantInput,
): Promise<InsertCreditGrantResult> {
  const db = getDbHttp();
  const rows = await db
    .insert(creditGrants)
    .values({
      id: input.id,
      uid: input.uid,
      subscriptionId: input.subscriptionId,
      planCode: input.planCode,
      billingCycle: input.billingCycle,
      amount: input.amount,
      grantMonth: input.grantMonth,
      triggerSource: input.triggerSource,
      triggerRef: input.triggerRef ?? null,
    })
    .onConflictDoNothing({ target: creditGrants.id })
    .returning({ id: creditGrants.id });
  return { inserted: rows.length > 0 };
}

export async function deleteCreditGrantById(id: string): Promise<void> {
  const db = getDbHttp();
  await db.delete(creditGrants).where(eq(creditGrants.id, id));
}
