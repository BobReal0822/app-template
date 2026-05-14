/**
 * `POST /api/billing/create-checkout-session` — pure handler.
 *
 * Creates a Stripe Checkout Session for a subscription purchase.
 */

import {
  type ApiResponse,
  ErrorCode,
  buildError,
  buildSuccess,
} from '../api/response';
import {
  type BillingCycle,
  type PlanCode,
  getStripePriceIdForSubscription,
} from '../config/pricing';
import * as logger from '../lib/logger';
import { resolveStripeCustomer } from '../services/billing/customer';
import {
  getStripeClient,
  getStripeReturnBaseUrl,
} from '../services/billing/stripe';

export interface CreateCheckoutSessionInput {
  purchaseType?: unknown;
  planCode?: unknown;
  billingCycle?: unknown;
  successPath?: unknown;
  cancelPath?: unknown;
}

export interface CheckoutAuthContext {
  uid: string;
  email?: string;
}

export interface CheckoutResultData {
  url: string | null;
}

const TAG = '[Billing:createCheckoutSession]';

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export async function handleCreateCheckoutSession(
  input: CreateCheckoutSessionInput,
  user: CheckoutAuthContext,
): Promise<ApiResponse<CheckoutResultData | null>> {
  const { uid, email } = user;
  const purchaseType = asString(input.purchaseType);
  const planCode = asString(input.planCode) as PlanCode | undefined;
  const billingCycle = asString(input.billingCycle) as BillingCycle | undefined;
  const successPath =
    asString(input.successPath) ?? '/app/settings?tab=subscription';
  const cancelPath =
    asString(input.cancelPath) ?? '/app/settings?tab=subscription';

  logger.debug(`${TAG} Request received`, {
    uid,
    purchaseType,
    planCode,
    billingCycle,
    successPath,
    cancelPath,
  });

  if (purchaseType !== 'subscription') {
    logger.warn(`${TAG} Invalid purchaseType`, { uid, purchaseType });
    return buildError(ErrorCode.INVALID_PARAMETER, 'Invalid purchaseType');
  }

  if (!planCode || !billingCycle) {
    logger.warn(`${TAG} Missing planCode or billingCycle`, {
      uid,
      planCode,
      billingCycle,
    });
    return buildError(
      ErrorCode.MISSING_PARAMETER,
      'Missing planCode or billingCycle',
    );
  }

  const priceId = getStripePriceIdForSubscription(planCode, billingCycle);
  if (!priceId) {
    logger.warn(`${TAG} Subscription price not configured`, {
      uid,
      planCode,
      billingCycle,
    });
    return buildError(
      ErrorCode.INVALID_PARAMETER,
      'Subscription price is not configured',
    );
  }

  logger.debug(`${TAG} Price resolved`, {
    uid,
    planCode,
    billingCycle,
    priceId,
  });

  try {
    const { customerId, created, fromCache } = await resolveStripeCustomer(
      uid,
      email,
    );
    logger.debug(`${TAG} Customer resolved`, {
      uid,
      customerId,
      created,
      fromCache,
    });

    const returnBase = getStripeReturnBaseUrl();
    const successUrl = `${returnBase}${successPath}`;
    const cancelUrl = `${returnBase}${cancelPath}`;

    logger.debug(`${TAG} Creating checkout session`, {
      uid,
      customerId,
      priceId,
      successPath,
      cancelPath,
      returnBase,
    });

    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      metadata: {
        uid,
        purchase_type: 'subscription',
        plan_code: planCode,
        billing_cycle: billingCycle,
      },
      subscription_data: {
        metadata: {
          uid,
          plan_code: planCode,
          billing_cycle: billingCycle,
        },
      },
    });

    logger.debug(`${TAG} Checkout session created`, {
      uid,
      customerId,
      sessionId: session.id,
      planCode,
      billingCycle,
    });

    return buildSuccess({ url: session.url });
  } catch (error) {
    logger.error(`${TAG} Error`, error);
    return buildError(ErrorCode.INTERNAL_SERVER_ERROR);
  }
}
