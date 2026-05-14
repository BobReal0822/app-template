import { addUtcMonths } from '@/server/lib/date-utc';
import * as logger from '@/server/lib/logger';
import { updateUserPlanFields } from '@/server/services/billing/db-mirror';
import { setNextFreeCreditGrantAtOnly } from '@/server/services/free-monthly-credits';

import {
  PLAN_CODE_VALUES,
  getUidFromMetadata,
  type HandlerResult,
} from './support';

import type Stripe from 'stripe';

export async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
): Promise<HandlerResult> {
  const tag = '[Billing:stripeWebhook:subscriptionDeleted]';
  logger.debug(`${tag} Processing`, {
    subscriptionId: subscription.id,
    customerId: subscription.customer,
    status: subscription.status,
  });

  const uid = getUidFromMetadata(subscription.metadata);
  if (!uid) {
    logger.warn(`${tag} Missing uid in subscription metadata`, {
      subscriptionId: subscription.id,
      metadata: subscription.metadata,
    });
    return { processed: false, reason: 'Missing uid in subscription metadata' };
  }

  await updateUserPlanFields({
    uid,
    plan: PLAN_CODE_VALUES.free,
    planCredits: 0,
    planExpiredAt: null,
    cancelAtPeriodEnd: false,
    subscriptionBillingCycle: null,
    stripeSubscriptionId: null,
    nextYearlyCreditGrantAt: null,
    yearlyCreditGrantAnchorDay: null,
  });
  await setNextFreeCreditGrantAtOnly(
    uid,
    addUtcMonths(new Date(), 1),
    new Date().getUTCDate(),
  );
  logger.debug(`${tag} User downgraded to free plan`, {
    uid,
    subscriptionId: subscription.id,
  });
  return { processed: true };
}
