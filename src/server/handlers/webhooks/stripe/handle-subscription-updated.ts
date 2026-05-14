import * as logger from '@/server/lib/logger';
import {
  getUserBillingSyncState,
  updateUserPlanFields,
} from '@/server/services/billing/db-mirror';
import { getStripeClient } from '@/server/services/billing/stripe';

import {
  getUidFromMetadata,
  resolveCycleFromSubscription,
  resolvePeriodEndTimestamp,
  subscriptionPendingCancellation,
  type HandlerResult,
} from './support';

import type Stripe from 'stripe';

export async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
): Promise<HandlerResult> {
  const tag = '[Billing:stripeWebhook:subscriptionUpdated]';
  const uid = getUidFromMetadata(subscription.metadata);
  if (!uid) {
    logger.warn(`${tag} Missing uid in subscription metadata`, {
      subscriptionId: subscription.id,
    });
    return { processed: false, reason: 'Missing uid in subscription metadata' };
  }

  const row = await getUserBillingSyncState(uid);
  if (!row) {
    logger.warn(`${tag} User row not found`, {
      uid,
      subscriptionId: subscription.id,
    });
    return { processed: false, reason: 'User not found' };
  }

  let planExpiredAt = resolvePeriodEndTimestamp(subscription);
  if (!planExpiredAt && subscription.id) {
    const full = await getStripeClient().subscriptions.retrieve(
      subscription.id,
    );
    planExpiredAt = resolvePeriodEndTimestamp(full);
  }

  const cancelAtPeriodEnd = subscriptionPendingCancellation(subscription);
  const subscriptionBillingCycle = resolveCycleFromSubscription(subscription);

  logger.debug(`${tag} Syncing UI state`, {
    uid,
    subscriptionId: subscription.id,
    cancelAtPeriodEnd,
    planExpiredAt,
    status: subscription.status,
    stripeCancelAtPeriodEnd: subscription.cancel_at_period_end,
    stripeCancelAt: (
      subscription as Stripe.Subscription & { cancel_at?: number }
    ).cancel_at,
  });

  await updateUserPlanFields({
    uid,
    plan: row.plan,
    planCredits: row.planCredits,
    planExpiredAt,
    cancelAtPeriodEnd,
    subscriptionBillingCycle,
    stripeSubscriptionId: subscription.id,
    nextYearlyCreditGrantAt: row.nextYearlyCreditGrantAt,
    yearlyCreditGrantAnchorDay: row.yearlyCreditGrantAnchorDay,
  });

  return { processed: true };
}
