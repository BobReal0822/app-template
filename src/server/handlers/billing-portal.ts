/**
 * `POST /api/billing/create-portal-session` — pure handler.
 *
 * Creates a Stripe Billing Portal Session. Mirrors
 * Stripe Billing Portal session creation. Three flows:
 *
 *   - `default` / `payment_method_update`: require a cached
 *     `stripeCustomerId` in the DB. If none, fail with
 *     STRIPE_CUSTOMER_REQUIRED so the client can prompt the user to start a
 *     paid flow first.
 *   - `subscription_update`: lazily resolves a Stripe customer (search →
 *     create) and looks up an active/trialing subscription to attach to the
 *     portal `flow_data`.
 */

import Stripe from 'stripe';

import {
  type ApiResponse,
  ErrorCode,
  buildError,
  buildSuccess,
} from '../api/response';
import * as logger from '../lib/logger';
import { resolveStripeCustomer } from '../services/billing/customer';
import { getUserStripeCustomerIdRow } from '../services/billing/db-mirror';
import {
  getStripeClient,
  getStripePortalConfigurationId,
  getStripeReturnBaseUrl,
} from '../services/billing/stripe';

type PortalFlow = 'default' | 'payment_method_update' | 'subscription_update';

export interface CreatePortalSessionInput {
  returnPath?: unknown;
  flow?: unknown;
}

export interface PortalAuthContext {
  uid: string;
  email?: string;
}

export interface PortalResultData {
  url: string | null;
}

const TAG = '[Billing:createPortalSession]';

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function parsePortalFlow(value: unknown): PortalFlow {
  if (
    value === 'payment_method_update' ||
    value === 'subscription_update' ||
    value === 'default'
  ) {
    return value;
  }
  return 'default';
}

async function firstActiveOrTrialingSubscriptionId(
  customerId: string,
): Promise<string | null> {
  const { data } = await getStripeClient().subscriptions.list({
    customer: customerId,
    limit: 20,
  });
  const sub = data.find(
    (s) => s.status === 'active' || s.status === 'trialing',
  );
  return sub?.id ?? null;
}

export async function handleCreatePortalSession(
  input: CreatePortalSessionInput,
  user: PortalAuthContext,
): Promise<ApiResponse<PortalResultData | null>> {
  const { uid, email } = user;
  const returnPath =
    asString(input.returnPath) ?? '/app/settings?tab=subscription';
  const flow = parsePortalFlow(input.flow);

  logger.debug(`${TAG} Request received`, { uid, returnPath, flow });

  try {
    let customerId: string;

    if (flow === 'payment_method_update' || flow === 'default') {
      const stripeRow = await getUserStripeCustomerIdRow(uid);
      const cached = stripeRow?.stripeCustomerId?.trim();
      if (!cached) {
        logger.warn(`${TAG} No stripeCustomerId for portal flow`, {
          uid,
          flow,
        });
        return buildError(
          ErrorCode.STRIPE_CUSTOMER_REQUIRED,
          'Billing profile not found',
        );
      }
      customerId = cached;
      logger.debug(`${TAG} Using cached Stripe customer`, {
        uid,
        customerId,
        flow,
      });
    } else {
      const resolved = await resolveStripeCustomer(uid, email);
      customerId = resolved.customerId;
      logger.debug(`${TAG} Customer resolved`, {
        uid,
        customerId,
        created: resolved.created,
        fromCache: resolved.fromCache,
      });
    }

    const returnUrl = `${getStripeReturnBaseUrl()}${returnPath}`;
    logger.debug(`${TAG} Creating portal session`, {
      customerId,
      returnPath,
    });

    const params: Stripe.BillingPortal.SessionCreateParams = {
      customer: customerId,
      return_url: returnUrl,
    };
    const portalConfigurationId = getStripePortalConfigurationId();
    if (portalConfigurationId) {
      params.configuration = portalConfigurationId;
    }

    if (flow === 'payment_method_update') {
      params.flow_data = { type: 'payment_method_update' };
    } else if (flow === 'subscription_update') {
      const subscriptionId =
        await firstActiveOrTrialingSubscriptionId(customerId);
      if (subscriptionId) {
        params.flow_data = {
          type: 'subscription_update',
          subscription_update: { subscription: subscriptionId },
        };
      } else {
        logger.warn(
          `${TAG} No active/trialing subscription; opening default portal`,
          { customerId },
        );
      }
    }

    const session =
      await getStripeClient().billingPortal.sessions.create(params);

    logger.debug(`${TAG} Portal session created`, {
      uid,
      customerId,
      sessionId: session.id,
    });

    return buildSuccess({ url: session.url });
  } catch (error) {
    logger.error(`${TAG} Error`, error);
    return buildError(ErrorCode.INTERNAL_SERVER_ERROR);
  }
}
