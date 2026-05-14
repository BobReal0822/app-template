/**
 * Free-tier monthly credit reset (registration anniversary, UTC).
 * Used by `grantFreeMonthlyCredits` scheduler and `onUserCreated` /
 * subscription-deleted hooks.
 */

import { FREE_PLAN_MONTHLY_CREDITS } from '@/server/config/pricing';
import { addUtcMonths, formatGrantMonthUtc } from '@/server/lib/date-utc';
import * as logger from '@/server/lib/logger';
import {
  deleteCreditGrantById,
  insertCreditGrantIdempotent,
  updateUserNextFreeCreditGrantAt,
} from '@/server/services/billing/db-mirror';

import { resetUserCredits } from './credits';

const TAG = '[Billing:freeMonthlyCredits]';

/** Placeholder for credit_grants.subscription_id (no Stripe subscription for free tier). */
export const FREE_TIER_CREDIT_SUBSCRIPTION_SENTINEL = 'free_plan';

export function getFreeTierMonthlyCreditAmount(): number {
  return FREE_PLAN_MONTHLY_CREDITS;
}

/**
 * Sets the next grant time without issuing credits (first month after signup
 * still uses the DB default credits).
 */
export async function setNextFreeCreditGrantAtOnly(
  uid: string,
  nextAt: Date,
  anchorDay: number,
): Promise<void> {
  await updateUserNextFreeCreditGrantAt(uid, nextAt, anchorDay);
}

/**
 * From the first due instant, grant every month until the next due is in
 * the future, then persist `next_free_credit_grant_at`.
 */
export async function catchUpFreeMonthlyCreditsFromDueDate(
  uid: string,
  firstDueAt: Date,
  anchorDay: number,
  now: Date,
): Promise<void> {
  const amount = getFreeTierMonthlyCreditAmount();
  const normalizedAnchorDay = Math.min(Math.max(Math.trunc(anchorDay), 1), 31);
  let dueAt = firstDueAt;

  while (dueAt <= now) {
    const idempotencyKey = `scheduler_free_monthly:${uid}:${dueAt.getTime()}`;
    const result = await insertCreditGrantIdempotent({
      id: idempotencyKey,
      uid,
      subscriptionId: FREE_TIER_CREDIT_SUBSCRIPTION_SENTINEL,
      planCode: 'free',
      billingCycle: 'monthly',
      amount,
      grantMonth: formatGrantMonthUtc(dueAt),
      triggerSource: 'scheduler_free_monthly',
      triggerRef: null,
    });

    if (result.inserted) {
      try {
        await resetUserCredits(uid, amount);
      } catch (error) {
        try {
          await deleteCreditGrantById(idempotencyKey);
        } catch (rollbackError) {
          logger.error(`${TAG} Failed to rollback credit grant`, {
            uid,
            idempotencyKey,
            rollbackError,
          });
        }
        throw error;
      }
    } else {
      logger.info(
        `${TAG} Skipped credit reset because grant already processed`,
        {
          uid,
          idempotencyKey,
        },
      );
    }

    dueAt = addUtcMonths(dueAt, 1, normalizedAnchorDay);
  }

  await updateUserNextFreeCreditGrantAt(uid, dueAt, normalizedAnchorDay);
  logger.info(`${TAG} Updated next free credit grant`, {
    uid,
    nextFreeCreditGrantAt: dueAt.toISOString(),
  });
}
