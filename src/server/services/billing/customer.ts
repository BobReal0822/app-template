/**
 * Stripe Customer Resolution with DB Cache (Vercel side).
 *
 * Strategy:
 *   1. Look up `stripeCustomerId` in `users` (drizzle, ~10ms).
 *   2. On miss: search Stripe by `metadata.uid`, create if still not found,
 *      then write the resolved id back to `users`.
 *   3. Subsequent calls hit only the DB.
 *
 * All resolution paths read/write `users.stripe_customer_id` so the cache stays coherent.
 */

import * as logger from '../../lib/logger';

import {
  getUserStripeCustomerIdRow,
  setUserStripeCustomerId,
} from './db-mirror';
import { findOrCreateStripeCustomer } from './stripe';

export interface ResolvedCustomer {
  customerId: string;
  /** true when a brand-new Stripe customer was created (never had one before) */
  created: boolean;
  /** true when the id was fetched from the DB cache */
  fromCache: boolean;
}

export async function resolveStripeCustomer(
  uid: string,
  email?: string,
): Promise<ResolvedCustomer> {
  const tag = '[Billing:resolveStripeCustomer]';

  const row = await getUserStripeCustomerIdRow(uid);
  const cached = row?.stripeCustomerId;
  if (cached) {
    return { customerId: cached, created: false, fromCache: true };
  }

  logger.debug(`${tag} Cache miss, resolving from Stripe`, { uid });
  const { customerId, created } = await findOrCreateStripeCustomer(uid, email);

  await setUserStripeCustomerId(uid, customerId);
  logger.debug(`${tag} Cached stripeCustomerId`, {
    uid,
    customerId,
    created,
  });

  return { customerId, created, fromCache: false };
}
