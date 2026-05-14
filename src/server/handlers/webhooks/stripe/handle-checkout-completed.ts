import {
  getBillingCycleByPriceId,
  getPlanByPriceId,
} from '@/server/config/pricing';
import * as logger from '@/server/lib/logger';

import { getUidFromMetadata, type HandlerResult } from './support';

import type Stripe from 'stripe';

export async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
): Promise<HandlerResult> {
  const tag = '[Billing:stripeWebhook:checkoutCompleted]';
  logger.debug(`${tag} Processing`, {
    sessionId: session.id,
    mode: session.mode,
    customerId: session.customer,
  });

  const uid = getUidFromMetadata(session.metadata);
  if (!uid) {
    logger.warn(`${tag} Missing uid in checkout metadata`, {
      sessionId: session.id,
      metadata: session.metadata,
    });
    return { processed: false, reason: 'Missing uid in checkout metadata' };
  }

  if (session.mode === 'subscription') {
    const lineItem = session.line_items?.data?.[0];
    const priceId = lineItem?.price?.id;
    if (!priceId) {
      logger.warn(`${tag} Missing subscription price ID`, {
        sessionId: session.id,
        uid,
        lineItems: session.line_items?.data,
      });
      return { processed: false, reason: 'Missing subscription price ID' };
    }

    const plan = getPlanByPriceId(priceId);
    if (!plan) {
      logger.warn(`${tag} Unsupported price ID`, {
        sessionId: session.id,
        uid,
        priceId,
      });
      return {
        processed: false,
        reason: `Unsupported price ID: ${priceId}`,
      };
    }

    const cycle = getBillingCycleByPriceId(priceId);
    logger.debug(`${tag} Plan resolved`, {
      sessionId: session.id,
      uid,
      priceId,
      planCode: plan.code,
      cycle,
    });

    logger.debug(
      `${tag} Checkout acknowledged (credit grant handled by invoice.paid)`,
      {
        sessionId: session.id,
        uid,
        planCode: plan.code,
      },
    );
    return { processed: true };
  }

  logger.warn(`${tag} Unsupported checkout mode`, {
    sessionId: session.id,
    mode: session.mode,
  });
  return {
    processed: false,
    reason: `Unsupported checkout mode: ${session.mode}`,
  };
}
