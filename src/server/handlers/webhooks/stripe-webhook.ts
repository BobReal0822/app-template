/**
 * `POST /api/webhooks/stripe` — pure handler.
 *
 * Stripe webhook endpoint (subscriptions, invoices, customer events).
 * Verifies the Stripe webhook signature against the raw request body and
 * dispatches to the per-event handlers in `./stripe/*`. Idempotency is the
 * responsibility of the dispatched handlers (most rely on Stripe's own
 * `event.id` / DB idempotency rules, see `support.ts`).
 */

import Stripe from 'stripe';

import * as logger from '../../lib/logger';
import { stripeWebhookSecret } from '../../lib/secrets';
import { getStripeClient } from '../../services/billing/stripe';

import { handleCheckoutCompleted } from './stripe/handle-checkout-completed';
import { handleInvoicePaid } from './stripe/handle-invoice-paid';
import { handleSubscriptionDeleted } from './stripe/handle-subscription-deleted';
import { handleSubscriptionUpdated } from './stripe/handle-subscription-updated';

import type { HandlerResult } from './stripe/support';

export interface StripeWebhookResult {
  status: number;
  body: Record<string, unknown>;
}

export async function handleStripeWebhook(input: {
  rawBody: string;
  signature: string | null;
}): Promise<StripeWebhookResult> {
  const tag = '[Billing:stripeWebhook]';
  try {
    if (!input.signature) {
      logger.warn(`${tag} Missing or invalid stripe-signature header`);
      return { status: 400, body: { error: 'Invalid webhook signature' } };
    }

    const secret = stripeWebhookSecret.value();
    if (!secret) {
      logger.error(`${tag} Webhook secret is not configured`);
      return { status: 500, body: { error: 'Webhook not configured' } };
    }

    const event = getStripeClient().webhooks.constructEvent(
      input.rawBody,
      input.signature,
      secret,
    );

    logger.debug(`${tag} Event received`, {
      eventId: event.id,
      eventType: event.type,
      created: new Date(event.created * 1000).toISOString(),
    });
    logger.info(`${tag} event`, { eventId: event.id, eventType: event.type });

    let result: HandlerResult | null = null;
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const expanded = await getStripeClient().checkout.sessions.retrieve(
        session.id,
        { expand: ['line_items'] },
      );
      result = await handleCheckoutCompleted(expanded);
    } else if (event.type === 'invoice.paid') {
      result = await handleInvoicePaid(event.data.object as Stripe.Invoice);
    } else if (event.type === 'customer.subscription.updated') {
      result = await handleSubscriptionUpdated(
        event.data.object as Stripe.Subscription,
      );
    } else if (event.type === 'customer.subscription.deleted') {
      result = await handleSubscriptionDeleted(
        event.data.object as Stripe.Subscription,
      );
    } else {
      result = {
        processed: false,
        reason: `Unhandled event type: ${event.type}`,
      };
    }

    if (result.processed) {
      logger.debug(`${tag} Event processed successfully`, {
        eventId: event.id,
        eventType: event.type,
      });
    } else {
      logger.warn(`${tag} Event ignored`, {
        eventId: event.id,
        eventType: event.type,
        reason: result.reason || 'Unknown reason',
      });
    }

    return { status: 200, body: { received: true } };
  } catch (error) {
    logger.error(`${tag} Error`, error);
    const isSignatureError =
      error instanceof Stripe.errors.StripeSignatureVerificationError;
    return {
      status: isSignatureError ? 400 : 500,
      body: {
        error: isSignatureError
          ? 'Invalid webhook signature'
          : 'Internal server error',
      },
    };
  }
}
