/**
 * Stripe client + helpers.
 *
 * Lazily constructs a singleton `Stripe` instance using `STRIPE_SECRET_KEY`
 * and `NEXT_PUBLIC_APP_URL` from `@/server/lib/secrets`.
 */

import Stripe from 'stripe';

import {
  appUrl,
  stripePortalConfigurationId,
  stripeSecretKey,
} from '../../lib/secrets';

let stripeClient: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (stripeClient) {
    return stripeClient;
  }

  const secretKey = stripeSecretKey.value();
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }

  stripeClient = new Stripe(secretKey);
  return stripeClient;
}

export function getStripeClientVersionInfo(): {
  sdkVersion: string | null;
  apiVersion: string | null;
  isApiVersionPinnedInCode: boolean;
} {
  const stripe = getStripeClient() as unknown as {
    VERSION?: string;
    getApiField?: (field: string) => unknown;
  };

  const sdkVersion =
    typeof stripe.VERSION === 'string' && stripe.VERSION
      ? stripe.VERSION
      : null;
  const apiVersionRaw =
    typeof stripe.getApiField === 'function'
      ? stripe.getApiField('version')
      : null;
  const apiVersion =
    typeof apiVersionRaw === 'string' && apiVersionRaw ? apiVersionRaw : null;

  // We currently initialize Stripe with `new Stripe(secretKey)` and do not pass `apiVersion`.
  const isApiVersionPinnedInCode = false;

  return { sdkVersion, apiVersion, isApiVersionPinnedInCode };
}

export function getStripeReturnBaseUrl(): string {
  return appUrl.value().replace(/\/+$/, '');
}

export function getStripePortalConfigurationId(): string | null {
  return stripePortalConfigurationId.value() || null;
}

function escapeStripeSearchValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

/**
 * Find an existing Stripe customer by `metadata.uid`, otherwise create one
 * using a deterministic idempotency key. Concurrent requests for the same
 * uid converge on the same customer record.
 */
export async function findOrCreateStripeCustomer(
  uid: string,
  email?: string,
): Promise<{ customerId: string; created: boolean }> {
  const stripe = getStripeClient();
  const escapedUid = escapeStripeSearchValue(uid);

  const searchResult = await stripe.customers.search({
    query: `metadata['uid']:'${escapedUid}'`,
    limit: 1,
  });

  if (searchResult.data[0]?.id) {
    return { customerId: searchResult.data[0].id, created: false };
  }

  const customer = await stripe.customers.create(
    { email, metadata: { uid } },
    { idempotencyKey: `customer-create-${uid}` },
  );
  return { customerId: customer.id, created: true };
}
