import {
  getBillingCycleByPriceId,
  getPlanByPriceId,
} from '@/server/config/pricing';
import { formatGrantMonthUtc } from '@/server/lib/date-utc';
import * as logger from '@/server/lib/logger';
import {
  getStripeClient,
  getStripeClientVersionInfo,
} from '@/server/services/billing/stripe';

import {
  applyPlanToUserFromWebhook,
  getPriceIdFromInvoice,
  getUidFromMetadata,
  resolveSubscriptionIdFromInvoicePayload,
  type HandlerResult,
} from './support';

import type Stripe from 'stripe';

function getInvoiceLinePeriodStart(
  line: Stripe.InvoiceLineItem,
): number | null {
  const periodStart =
    (line as Stripe.InvoiceLineItem & { period?: { start?: number | null } })
      .period?.start ?? null;
  return typeof periodStart === 'number' && periodStart > 0
    ? periodStart
    : null;
}

function resolveGrantMonthFromInvoice(
  invoice: Stripe.Invoice,
  subscription: Stripe.Subscription,
): string {
  const lines = invoice.lines?.data ?? [];
  const subscriptionLine = lines.find(
    (line) =>
      ((line as Stripe.InvoiceLineItem & { type?: string | null }).type ??
        null) === 'subscription',
  );
  const linePeriodStart =
    (subscriptionLine ? getInvoiceLinePeriodStart(subscriptionLine) : null) ??
    lines.map(getInvoiceLinePeriodStart).find((v): v is number => v != null) ??
    null;

  const subscriptionPeriodStart =
    (
      subscription as Stripe.Subscription & {
        current_period_start?: number | null;
      }
    ).current_period_start ??
    (
      subscription.items?.data?.[0] as
        | (Stripe.SubscriptionItem & { current_period_start?: number | null })
        | undefined
    )?.current_period_start ??
    null;

  const timestampSeconds =
    linePeriodStart ??
    (typeof subscriptionPeriodStart === 'number' && subscriptionPeriodStart > 0
      ? subscriptionPeriodStart
      : null) ??
    invoice.created;
  return formatGrantMonthUtc(new Date(timestampSeconds * 1000));
}

export function shouldGrantCreditsForInvoiceContext(
  cycle: ReturnType<typeof getBillingCycleByPriceId>,
  billingReason: string | null | undefined,
): boolean {
  if (cycle !== 'yearly') return true;

  // For yearly subscriptions, monthly credits are primarily scheduler-driven.
  // Avoid duplicate grants on annual renewal invoices.
  if (billingReason === 'subscription_cycle') {
    return false;
  }
  return true;
}

export async function handleInvoicePaid(
  invoice: Stripe.Invoice & { subscription?: string | Stripe.Subscription },
): Promise<HandlerResult> {
  const tag = '[Billing:stripeWebhook:invoicePaid]';
  const stripeVersionInfo = getStripeClientVersionInfo();
  logger.debug(`${tag} Processing`, {
    invoiceId: invoice.id,
    customerId: invoice.customer,
    amountPaid: invoice.amount_paid,
    stripeSdkVersion: stripeVersionInfo.sdkVersion,
    stripeApiVersion: stripeVersionInfo.apiVersion,
    stripeApiVersionPinnedInCode: stripeVersionInfo.isApiVersionPinnedInCode,
  });

  const priceId = getPriceIdFromInvoice(invoice);
  if (!priceId) {
    logger.warn(`${tag} Missing invoice price ID`, {
      invoiceId: invoice.id,
      lines: invoice.lines?.data?.map((l) => ({
        id: l.id,
        type: (l as unknown as { type?: string }).type,
      })),
    });
    return { processed: false, reason: 'Missing invoice price ID' };
  }

  const plan = getPlanByPriceId(priceId);
  if (!plan) {
    logger.warn(`${tag} Unsupported invoice price ID`, {
      invoiceId: invoice.id,
      priceId,
    });
    return {
      processed: false,
      reason: `Unsupported invoice price ID: ${priceId}`,
    };
  }

  let subscriptionId = resolveSubscriptionIdFromInvoicePayload(invoice);
  if (!subscriptionId) {
    logger.debug(
      `${tag} subscription id missing on webhook payload, retrieving invoice`,
      {
        invoiceId: invoice.id,
      },
    );
    const fullInvoice = await getStripeClient().invoices.retrieve(invoice.id, {
      expand: ['lines.data.subscription', 'subscription'],
    });
    subscriptionId = resolveSubscriptionIdFromInvoicePayload(fullInvoice);
  }

  if (!subscriptionId) {
    logger.warn(`${tag} Missing invoice subscription ID`, {
      invoiceId: invoice.id,
      priceId,
    });
    return { processed: false, reason: 'Missing invoice subscription ID' };
  }

  const subscription =
    await getStripeClient().subscriptions.retrieve(subscriptionId);
  const uid = getUidFromMetadata(subscription.metadata);
  if (!uid) {
    logger.warn(`${tag} Missing uid in subscription metadata`, {
      invoiceId: invoice.id,
      subscriptionId,
      metadata: subscription.metadata,
    });
    return {
      processed: false,
      reason: 'Missing uid in subscription metadata',
    };
  }

  const cycle = getBillingCycleByPriceId(priceId);
  logger.debug(`${tag} Plan resolved`, {
    invoiceId: invoice.id,
    uid,
    subscriptionId,
    priceId,
    planCode: plan.code,
    cycle,
    subscriptionMetadata: subscription.metadata,
  });

  const billingReason =
    (invoice as Stripe.Invoice & { billing_reason?: string | null })
      .billing_reason ?? null;
  const shouldGrantCredits = shouldGrantCreditsForInvoiceContext(
    cycle,
    billingReason,
  );
  if (!shouldGrantCredits) {
    logger.debug(`${tag} Skipping credit reset on yearly renewal invoice`, {
      invoiceId: invoice.id,
      uid,
      subscriptionId,
      cycle,
      billingReason,
    });
  }

  await applyPlanToUserFromWebhook(
    uid,
    plan.code,
    cycle,
    subscription,
    shouldGrantCredits
      ? {
          idempotencyKey: `invoice_paid:${invoice.id}`,
          source: 'invoice_paid',
          subscriptionId,
          reference: invoice.id,
          grantMonth: resolveGrantMonthFromInvoice(invoice, subscription),
        }
      : undefined,
    shouldGrantCredits ? undefined : false,
  );
  logger.debug(`${tag} Plan applied successfully`, {
    invoiceId: invoice.id,
    uid,
    planCode: plan.code,
  });
  return { processed: true };
}
