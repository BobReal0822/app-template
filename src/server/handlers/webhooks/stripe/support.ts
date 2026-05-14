import {
  BillingCycle,
  PlanCode,
  getBillingCycleByPriceId,
  getPlanByPriceId,
  getPricingPlans,
} from '@/server/config/pricing';
import { addUtcMonths } from '@/server/lib/date-utc';
import * as logger from '@/server/lib/logger';
import {
  deleteCreditGrantById,
  insertCreditGrantIdempotent,
  updateUserPlanFields,
} from '@/server/services/billing/db-mirror';
import { resetUserCredits } from '@/server/services/credits';

import type Stripe from 'stripe';

// --- Webhook result & plan ids ------------------------------------------------

export interface HandlerResult {
  processed: boolean;
  reason?: string;
}

/** Must match `users.plan` allowed values in `@app/db` schema. */
export const PLAN_CODE_VALUES: Record<PlanCode, PlanCode> = {
  free: 'free',
  starter: 'starter',
  pro_s: 'pro_s',
  pro_m: 'pro_m',
  pro_l: 'pro_l',
  enterprise: 'enterprise',
};

/** Derived from `PLAN_CODE_VALUES` so metadata validation stays in sync with `PlanCode`. */
const VALID_METADATA_PLAN_CODES = new Set<string>(
  Object.keys(PLAN_CODE_VALUES) as PlanCode[],
);

export type CreditGrantTriggerSource = 'invoice_paid' | 'scheduler_yearly';

export interface CreditGrantContext {
  idempotencyKey: string;
  source: CreditGrantTriggerSource;
  subscriptionId?: string;
  reference?: string;
  grantMonth: string; // YYYY-MM
}

interface ApplyPlanCoreInput {
  uid: string;
  planCode: PlanCode;
  cycle: BillingCycle | null;
  planExpiredAt?: string | null;
  cancelAtPeriodEnd?: boolean;
  stripeSubscriptionId?: string;
  nextYearlyCreditGrantAt: string | null;
  yearlyGrantAnchorDay: number | null;
  grantContext?: CreditGrantContext;
  shouldResetCreditsOverride?: boolean;
}

// --- Raw body for Stripe signature verification ------------------------------

// --- Metadata & subscription timestamps --------------------------------------

export function getUidFromMetadata(
  metadata: Record<string, string> | null | undefined,
): string | null {
  const uid = metadata?.uid;
  return uid?.trim() ? uid : null;
}

export function resolvePeriodEndTimestamp(
  subscription?: Stripe.Subscription | null,
): string | null {
  if (!subscription) return null;
  const sub = subscription as Stripe.Subscription & {
    current_period_end?: number;
    cancel_at?: number | null;
  };
  const periodEndSeconds =
    sub.current_period_end ?? sub.items?.data?.[0]?.current_period_end ?? null;
  if (!periodEndSeconds) return null;
  return new Date(periodEndSeconds * 1000).toISOString();
}

/**
 * Whether the subscription is scheduled to end while still active.
 * Clover / API 2026+ often sets `cancel_at` (timestamp) with `cancel_at_period_end: false`.
 * @see https://docs.stripe.com/api/subscriptions/object
 */
export function subscriptionPendingCancellation(
  subscription: Stripe.Subscription | null | undefined,
): boolean {
  if (!subscription) return false;
  if (subscription.cancel_at_period_end) return true;

  const status = subscription.status;
  if (
    status === 'canceled' ||
    status === 'unpaid' ||
    status === 'incomplete_expired'
  ) {
    return false;
  }

  const cancelAt = (
    subscription as Stripe.Subscription & { cancel_at?: number | null }
  ).cancel_at;
  if (cancelAt != null && cancelAt > 0) {
    return true;
  }

  return false;
}

// --- Invoice lines (price id, subscription id resolution) --------------------

function getInvoiceLinePriceId(line: Stripe.InvoiceLineItem): string | null {
  const lineData = line as unknown as {
    price?: string | { id?: string } | null;
    pricing?: { price_details?: { price?: string | { id?: string } | null } };
  };

  const directPrice = lineData.price;
  if (typeof directPrice === 'string') return directPrice;
  if (typeof directPrice?.id === 'string') return directPrice.id;

  const nestedPrice = lineData.pricing?.price_details?.price;
  if (typeof nestedPrice === 'string') return nestedPrice;
  if (typeof nestedPrice?.id === 'string') return nestedPrice.id;
  return null;
}

function isSubscriptionInvoiceLine(line: Stripe.InvoiceLineItem): boolean {
  const lineType = (line as unknown as { type?: string | null }).type;
  return lineType === 'subscription';
}

function getLineAmount(line: Stripe.InvoiceLineItem): number {
  return (line as unknown as { amount?: number }).amount ?? 0;
}

export function getPriceIdFromInvoice(invoice: Stripe.Invoice): string | null {
  const lines = invoice.lines?.data ?? [];
  if (lines.length === 0) return null;

  const linesWithPrice = lines
    .map((line) => ({
      line,
      priceId: getInvoiceLinePriceId(line),
      amount: getLineAmount(line),
    }))
    .filter((x): x is typeof x & { priceId: string } => Boolean(x.priceId));

  if (linesWithPrice.length === 0) return null;

  if (linesWithPrice.length === 1) {
    return linesWithPrice[0].priceId;
  }

  const subscriptionLine = lines.find(isSubscriptionInvoiceLine);
  if (subscriptionLine) {
    const pid = getInvoiceLinePriceId(subscriptionLine);
    if (pid) return pid;
  }

  const positive = linesWithPrice.filter((x) => x.amount > 0);
  if (positive.length === 1) return positive[0].priceId;
  if (positive.length > 1) {
    return positive.sort((a, b) => b.amount - a.amount)[0].priceId;
  }

  return linesWithPrice[0].priceId;
}

function parseSubscriptionIdFromField(
  field: string | Stripe.Subscription | null | undefined,
): string | null {
  if (typeof field === 'string' && field) return field;
  if (field && typeof field === 'object' && 'id' in field && field.id) {
    return field.id;
  }
  return null;
}

type InvoiceWithOptionalSubscription = Stripe.Invoice & {
  subscription?: string | Stripe.Subscription | null;
};

export function resolveSubscriptionIdFromInvoicePayload(
  invoice: Stripe.Invoice,
): string | null {
  const ext = invoice as InvoiceWithOptionalSubscription;
  const fromInvoice = parseSubscriptionIdFromField(ext.subscription);
  if (fromInvoice) return fromInvoice;

  const cloverParent = (
    invoice as unknown as {
      parent?: {
        subscription_details?: {
          subscription?: string | Stripe.Subscription | null;
        };
      } | null;
    }
  ).parent;
  const fromInvoiceParent = parseSubscriptionIdFromField(
    cloverParent?.subscription_details?.subscription,
  );
  if (fromInvoiceParent) return fromInvoiceParent;

  for (const line of invoice.lines?.data ?? []) {
    const lineSub = (line as Stripe.InvoiceLineItem).subscription;
    const id = parseSubscriptionIdFromField(lineSub);
    if (id) return id;

    const nested = (
      line as unknown as {
        parent?: {
          subscription_item_details?: { subscription?: string | null };
        };
      }
    ).parent?.subscription_item_details?.subscription;
    if (typeof nested === 'string' && nested) return nested;
  }

  return null;
}

// --- Apply plan + credits (shared by checkout & invoice.paid) ----------------

function getSubscriptionPlanCredits(planCode: PlanCode): number {
  return (
    getPricingPlans().find((item) => item.code === planCode)?.monthlyCredits ||
    0
  );
}

function resolveSubscriptionPeriodStartDate(
  subscription?: Stripe.Subscription | null,
): Date {
  const sub = subscription as
    | (Stripe.Subscription & { current_period_start?: number })
    | null
    | undefined;
  const periodStartSeconds =
    sub?.current_period_start ??
    subscription?.items?.data?.[0]?.current_period_start;
  if (periodStartSeconds && periodStartSeconds > 0) {
    return new Date(periodStartSeconds * 1000);
  }
  return new Date();
}

function parseIsoDateOrNull(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function resolveCycleFromSubscription(
  subscription: Stripe.Subscription,
): BillingCycle | null {
  const cycle = subscription.metadata?.billing_cycle;
  if (cycle === 'monthly' || cycle === 'yearly') return cycle;
  const priceId = subscription.items?.data?.[0]?.price?.id;
  return priceId ? getBillingCycleByPriceId(priceId) : null;
}

export function resolvePlanCodeFromSubscription(
  subscription: Stripe.Subscription,
): PlanCode | null {
  const fromMetadata = subscription.metadata?.plan_code;
  if (fromMetadata && VALID_METADATA_PLAN_CODES.has(fromMetadata)) {
    return fromMetadata as PlanCode;
  }
  const priceId = subscription.items?.data?.[0]?.price?.id;
  return priceId ? (getPlanByPriceId(priceId)?.code ?? null) : null;
}

function resolveNextYearlyCreditGrantAt(
  cycle: BillingCycle | null,
  subscription?: Stripe.Subscription | null,
): string | null {
  if (cycle !== 'yearly') return null;
  const periodStart = resolveSubscriptionPeriodStartDate(subscription);
  return addUtcMonths(periodStart, 1, periodStart.getUTCDate()).toISOString();
}

function resolveYearlyGrantAnchorDay(
  cycle: BillingCycle | null,
  subscription?: Stripe.Subscription | null,
): number | null {
  if (cycle !== 'yearly') return null;
  return resolveSubscriptionPeriodStartDate(subscription).getUTCDate();
}

async function applyPlanToUserCore({
  uid,
  planCode,
  cycle,
  planExpiredAt,
  cancelAtPeriodEnd,
  stripeSubscriptionId,
  nextYearlyCreditGrantAt,
  yearlyGrantAnchorDay,
  grantContext,
  shouldResetCreditsOverride,
}: ApplyPlanCoreInput): Promise<void> {
  const tag = '[Billing:stripeWebhook:applyPlan]';
  const planCredits = getSubscriptionPlanCredits(planCode);
  const creditsToGrant = planCredits;
  const subscriptionIdForGrant =
    grantContext?.subscriptionId ?? stripeSubscriptionId ?? null;
  let insertedCreditGrant = false;
  let shouldResetCredits = shouldResetCreditsOverride ?? creditsToGrant > 0;
  const stripeSubscriptionIdForUpdate =
    stripeSubscriptionId ?? grantContext?.subscriptionId;

  logger.debug(`${tag} Applying plan`, {
    uid,
    planCode,
    cycle,
    planDbCode: PLAN_CODE_VALUES[planCode],
    planCredits,
    creditsToGrant,
    planExpiredAt,
    cancelAtPeriodEnd,
    nextYearlyCreditGrantAt,
    subscriptionId: subscriptionIdForGrant,
    yearlyGrantAnchorDay,
    grantContext: grantContext ?? null,
    shouldResetCredits,
  });

  if (grantContext && creditsToGrant > 0) {
    if (!subscriptionIdForGrant) {
      const err = new Error(
        '[Billing:stripeWebhook:applyPlan] Cannot record credit grant: missing subscription id',
      );
      logger.error(err.message, {
        uid,
        planCode,
        cycle,
        idempotencyKey: grantContext.idempotencyKey,
      });
      throw err;
    }
    if (cycle !== 'monthly' && cycle !== 'yearly') {
      const err = new Error(
        '[Billing:stripeWebhook:applyPlan] Cannot record credit grant: billing cycle must be monthly or yearly',
      );
      logger.error(err.message, {
        uid,
        subscriptionId: subscriptionIdForGrant,
        planCode,
        cycle,
      });
      throw err;
    }
    const result = await insertCreditGrantIdempotent({
      id: grantContext.idempotencyKey,
      uid,
      subscriptionId: subscriptionIdForGrant,
      planCode,
      billingCycle: cycle,
      amount: creditsToGrant,
      grantMonth: grantContext.grantMonth,
      triggerSource: grantContext.source,
      triggerRef: grantContext.reference,
    });
    if (result.inserted) {
      insertedCreditGrant = true;
      logger.debug(`${tag} Credit grant lock acquired`, {
        uid,
        subscriptionId: subscriptionIdForGrant,
        idempotencyKey: grantContext.idempotencyKey,
      });
    } else {
      shouldResetCredits = false;
      logger.debug(`${tag} Credit grant skipped (already processed)`, {
        uid,
        subscriptionId: subscriptionIdForGrant,
        idempotencyKey: grantContext.idempotencyKey,
      });
    }
  }

  await updateUserPlanFields({
    uid,
    plan: PLAN_CODE_VALUES[planCode],
    planCredits,
    subscriptionBillingCycle: cycle,
    nextYearlyCreditGrantAt:
      cycle === 'yearly' ? nextYearlyCreditGrantAt : null,
    yearlyCreditGrantAnchorDay:
      cycle === 'yearly' ? yearlyGrantAnchorDay : null,
    ...(planExpiredAt !== undefined ? { planExpiredAt } : {}),
    ...(cancelAtPeriodEnd !== undefined ? { cancelAtPeriodEnd } : {}),
    ...(stripeSubscriptionIdForUpdate
      ? { stripeSubscriptionId: stripeSubscriptionIdForUpdate }
      : {}),
  });
  logger.debug(`${tag} updateUserPlan succeeded`, { uid, planCode });

  if (shouldResetCredits) {
    try {
      await resetUserCredits(uid, creditsToGrant);
      logger.debug(`${tag} resetUserCredits succeeded`, {
        uid,
        creditsToGrant,
      });
    } catch (error) {
      if (grantContext && insertedCreditGrant) {
        try {
          await deleteCreditGrantById(grantContext.idempotencyKey);
          logger.debug(`${tag} Rolled back credit grant lock`, {
            uid,
            idempotencyKey: grantContext.idempotencyKey,
          });
        } catch (rollbackError) {
          logger.error(`${tag} Failed to rollback credit grant lock`, {
            uid,
            idempotencyKey: grantContext.idempotencyKey,
            rollbackError,
          });
        }
      }
      throw error;
    }
  } else if (creditsToGrant > 0) {
    logger.debug(`${tag} Skipped credit reset`, {
      uid,
      idempotencyKey: grantContext?.idempotencyKey ?? null,
      reason:
        shouldResetCreditsOverride === false
          ? 'disabled_by_caller'
          : 'grant_already_processed',
    });
  }
}

export async function applyPlanToUserFromWebhook(
  uid: string,
  planCode: PlanCode,
  cycle: BillingCycle | null,
  subscription: Stripe.Subscription,
  grantContext?: CreditGrantContext,
  shouldResetCreditsOverride?: boolean,
  nextYearlyCreditGrantAtOverride?: string | null,
  yearlyGrantAnchorDayOverride?: number | null,
): Promise<void> {
  const nextYearlyCreditGrantAt =
    nextYearlyCreditGrantAtOverride ??
    resolveNextYearlyCreditGrantAt(cycle, subscription);
  const yearlyGrantAnchorDay =
    yearlyGrantAnchorDayOverride ??
    resolveYearlyGrantAnchorDay(cycle, subscription);
  await applyPlanToUserCore({
    uid,
    planCode,
    cycle,
    planExpiredAt: resolvePeriodEndTimestamp(subscription),
    cancelAtPeriodEnd: subscriptionPendingCancellation(subscription),
    stripeSubscriptionId: subscription.id,
    nextYearlyCreditGrantAt,
    yearlyGrantAnchorDay,
    grantContext,
    shouldResetCreditsOverride,
  });
}

export async function applyPlanToUserFromScheduler(
  uid: string,
  planCode: PlanCode,
  cycle: BillingCycle | null,
  nextYearlyCreditGrantAtOverride: string | null | undefined,
  grantContext: CreditGrantContext,
  yearlyGrantAnchorDayOverride?: number | null,
): Promise<void> {
  const nextYearlyCreditGrantAt =
    nextYearlyCreditGrantAtOverride ??
    resolveNextYearlyCreditGrantAt(cycle, null);
  const yearlyGrantAnchorDay =
    yearlyGrantAnchorDayOverride ?? resolveYearlyGrantAnchorDay(cycle, null);
  await applyPlanToUserCore({
    uid,
    planCode,
    cycle,
    stripeSubscriptionId: grantContext.subscriptionId,
    nextYearlyCreditGrantAt,
    yearlyGrantAnchorDay,
    grantContext,
  });
}

export function resolveYearlyGrantScheduleState(
  currentNextYearlyCreditGrantAt: string | null | undefined,
  yearlyGrantAnchorDay: number | null | undefined,
  now: Date,
): {
  shouldGrant: boolean;
  nextYearlyCreditGrantAt: string | null;
  dueGrantInstants: string[];
} {
  const currentNext = parseIsoDateOrNull(currentNextYearlyCreditGrantAt);
  if (!currentNext) {
    return {
      shouldGrant: false,
      nextYearlyCreditGrantAt: null,
      dueGrantInstants: [],
    };
  }

  if (now < currentNext) {
    return {
      shouldGrant: false,
      nextYearlyCreditGrantAt: currentNext.toISOString(),
      dueGrantInstants: [],
    };
  }

  const normalizedAnchorDay =
    typeof yearlyGrantAnchorDay === 'number' &&
    Number.isFinite(yearlyGrantAnchorDay) &&
    yearlyGrantAnchorDay >= 1 &&
    yearlyGrantAnchorDay <= 31
      ? Math.trunc(yearlyGrantAnchorDay)
      : currentNext.getUTCDate();
  const dueGrantInstants: string[] = [];
  let next = currentNext;
  while (now >= next) {
    dueGrantInstants.push(next.toISOString());
    next = addUtcMonths(next, 1, normalizedAnchorDay);
  }
  return {
    shouldGrant: dueGrantInstants.length > 0,
    nextYearlyCreditGrantAt: next.toISOString(),
    dueGrantInstants,
  };
}
