/**
 * `src/server/services/billing/customer.ts` — DB-cached Stripe customer
 * resolution.
 *
 * Coverage:
 *   - Cache hit: row.stripeCustomerId present → returns directly, no Stripe
 *     call, no write-back, fromCache=true.
 *   - Cache miss (no row): falls back to findOrCreateStripeCustomer, writes
 *     id back to users, returns created flag.
 *   - Cache miss (row present, stripeCustomerId is null): same as above; the
 *     row exists but the column is null.
 *   - Cache miss (row present, stripeCustomerId === ''): treated as miss —
 *     falsy guard.
 *   - Stripe `created=true` is forwarded.
 *   - DB read error: bubbles up, no Stripe call.
 *   - Stripe error: bubbles up, no write-back.
 *   - Write-back error: bubbles up after Stripe call.
 *   - email is forwarded to Stripe helper when provided, undefined otherwise.
 */

jest.mock('../db-mirror', () => ({
  __esModule: true,
  getUserStripeCustomerIdRow: jest.fn(),
  setUserStripeCustomerId: jest.fn(),
}));

jest.mock('../stripe', () => ({
  __esModule: true,
  findOrCreateStripeCustomer: jest.fn(),
}));

jest.mock('../../../lib/logger', () => ({
  __esModule: true,
  debug: jest.fn(),
}));

import { resolveStripeCustomer } from '@/server/services/billing/customer';
import {
  getUserStripeCustomerIdRow,
  setUserStripeCustomerId,
} from '@/server/services/billing/db-mirror';
import { findOrCreateStripeCustomer } from '@/server/services/billing/stripe';

const mGetRow = getUserStripeCustomerIdRow as jest.MockedFunction<
  typeof getUserStripeCustomerIdRow
>;
const mSetRow = setUserStripeCustomerId as jest.MockedFunction<
  typeof setUserStripeCustomerId
>;
const mFind = findOrCreateStripeCustomer as jest.MockedFunction<
  typeof findOrCreateStripeCustomer
>;

beforeEach(() => {
  jest.resetAllMocks();
});

describe('resolveStripeCustomer — cache hit', () => {
  it('returns cached id without calling Stripe or write-back', async () => {
    mGetRow.mockResolvedValue({ stripeCustomerId: 'cus_cached' });

    const r = await resolveStripeCustomer('uid-1', 'a@b.com');

    expect(r).toEqual({
      customerId: 'cus_cached',
      created: false,
      fromCache: true,
    });
    expect(mGetRow).toHaveBeenCalledWith('uid-1');
    expect(mFind).not.toHaveBeenCalled();
    expect(mSetRow).not.toHaveBeenCalled();
  });
});

describe('resolveStripeCustomer — cache miss (no row)', () => {
  it('resolves from Stripe and writes id back', async () => {
    mGetRow.mockResolvedValue(null);
    mFind.mockResolvedValue({ customerId: 'cus_new', created: true });

    const r = await resolveStripeCustomer('uid-2', 'new@x.com');

    expect(r).toEqual({
      customerId: 'cus_new',
      created: true,
      fromCache: false,
    });
    expect(mFind).toHaveBeenCalledWith('uid-2', 'new@x.com');
    expect(mSetRow).toHaveBeenCalledWith('uid-2', 'cus_new');
  });
});

describe('resolveStripeCustomer — cache miss (row present, null column)', () => {
  it('treats null stripeCustomerId as miss', async () => {
    mGetRow.mockResolvedValue({ stripeCustomerId: null });
    mFind.mockResolvedValue({ customerId: 'cus_filled', created: false });

    const r = await resolveStripeCustomer('uid-3');

    expect(r).toEqual({
      customerId: 'cus_filled',
      created: false,
      fromCache: false,
    });
    expect(mFind).toHaveBeenCalledWith('uid-3', undefined);
    expect(mSetRow).toHaveBeenCalledWith('uid-3', 'cus_filled');
  });
});

describe('resolveStripeCustomer — cache miss (empty string)', () => {
  it('treats "" as falsy and re-resolves', async () => {
    mGetRow.mockResolvedValue({ stripeCustomerId: '' });
    mFind.mockResolvedValue({ customerId: 'cus_real', created: false });

    const r = await resolveStripeCustomer('uid-4');

    expect(r.customerId).toBe('cus_real');
    expect(r.fromCache).toBe(false);
    expect(mSetRow).toHaveBeenCalledWith('uid-4', 'cus_real');
  });
});

describe('resolveStripeCustomer — Stripe created flag', () => {
  it('forwards created=true', async () => {
    mGetRow.mockResolvedValue(null);
    mFind.mockResolvedValue({ customerId: 'cus_brand_new', created: true });

    const r = await resolveStripeCustomer('uid-5');
    expect(r.created).toBe(true);
  });

  it('forwards created=false (existing customer in Stripe found by uid)', async () => {
    mGetRow.mockResolvedValue(null);
    mFind.mockResolvedValue({ customerId: 'cus_existing', created: false });

    const r = await resolveStripeCustomer('uid-6');
    expect(r.created).toBe(false);
  });
});

describe('resolveStripeCustomer — error propagation', () => {
  it('throws when DB read fails (no Stripe call)', async () => {
    mGetRow.mockRejectedValue(new Error('db down'));

    await expect(resolveStripeCustomer('uid-7')).rejects.toThrow('db down');
    expect(mFind).not.toHaveBeenCalled();
    expect(mSetRow).not.toHaveBeenCalled();
  });

  it('throws when Stripe call fails (no write-back)', async () => {
    mGetRow.mockResolvedValue(null);
    mFind.mockRejectedValue(new Error('stripe 500'));

    await expect(resolveStripeCustomer('uid-8', 'x@y.com')).rejects.toThrow(
      'stripe 500',
    );
    expect(mSetRow).not.toHaveBeenCalled();
  });

  it('throws when write-back fails (after Stripe call succeeded)', async () => {
    mGetRow.mockResolvedValue(null);
    mFind.mockResolvedValue({ customerId: 'cus_x', created: true });
    mSetRow.mockRejectedValue(new Error('write-back failed'));

    await expect(resolveStripeCustomer('uid-9')).rejects.toThrow(
      'write-back failed',
    );
    expect(mFind).toHaveBeenCalled();
  });
});

describe('resolveStripeCustomer — email forwarding', () => {
  it('passes undefined email through', async () => {
    mGetRow.mockResolvedValue(null);
    mFind.mockResolvedValue({ customerId: 'cus_z', created: false });

    await resolveStripeCustomer('uid-10');
    expect(mFind).toHaveBeenCalledWith('uid-10', undefined);
  });
});
