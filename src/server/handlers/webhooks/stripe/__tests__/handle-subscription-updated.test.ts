/**
 * `customer.subscription.updated` webhook → DB sync.
 *
 * Coverage:
 *   - missing uid metadata → not processed
 *   - user not found in DB → not processed
 *   - happy path: writes plan/credits snapshot + cancel state + cycle +
 *     subscription id from current row
 *   - planExpiredAt fallback: top-level period end missing → fetch full
 *     subscription via Stripe API → derive
 *   - cancel state: cancel_at_period_end=true → cancelAtPeriodEnd=true
 *   - cycle resolved from metadata wins over price id mapping
 */

jest.mock('../../../../services/billing/db-mirror', () => ({
  __esModule: true,
  getUserBillingSyncState: jest.fn(),
  updateUserPlanFields: jest.fn(),
}));

jest.mock('../../../../services/credits', () => ({
  __esModule: true,
  resetUserCredits: jest.fn(),
}));

jest.mock('../../../../services/billing/stripe', () => ({
  __esModule: true,
  getStripeClient: jest.fn(),
}));

jest.mock('../../../../config/pricing', () => ({
  __esModule: true,
  getPricingPlans: jest.fn(() => []),
  getPlanByPriceId: jest.fn(() => null),
  getBillingCycleByPriceId: jest.fn(() => null),
}));

jest.mock('../../../../lib/logger', () => ({
  __esModule: true,
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
}));

import { handleSubscriptionUpdated } from '@/server/handlers/webhooks/stripe/handle-subscription-updated';
import {
  getUserBillingSyncState,
  updateUserPlanFields,
} from '@/server/services/billing/db-mirror';
import { getStripeClient } from '@/server/services/billing/stripe';

import type Stripe from 'stripe';

const mGetRow = getUserBillingSyncState as jest.MockedFunction<
  typeof getUserBillingSyncState
>;
const mUpdate = updateUserPlanFields as jest.MockedFunction<
  typeof updateUserPlanFields
>;
const mGetStripe = getStripeClient as jest.MockedFunction<
  typeof getStripeClient
>;

beforeEach(() => {
  jest.resetAllMocks();
});

function makeSub(
  opts: {
    id?: string;
    uid?: string;
    cancelAtPeriodEnd?: boolean;
    currentPeriodEnd?: number | null;
    metadata?: Record<string, string>;
  } = {},
): Stripe.Subscription {
  const {
    id = 'sub_xyz',
    uid = 'uid-1',
    cancelAtPeriodEnd = false,
    currentPeriodEnd = 1719792000,
    metadata,
  } = opts;
  return {
    id,
    cancel_at_period_end: cancelAtPeriodEnd,
    status: 'active',
    current_period_end: currentPeriodEnd,
    metadata: metadata ?? { uid },
    items: {
      data: [
        {
          id: 'si_1',
          price: { id: 'price_unknown' },
          current_period_end: currentPeriodEnd,
        },
      ],
    },
  } as unknown as Stripe.Subscription;
}

const ROW_BASE = {
  plan: 'pro_s',
  planCredits: 500,
  nextYearlyCreditGrantAt: null as Date | null,
  yearlyCreditGrantAnchorDay: null as number | null,
};

describe('handleSubscriptionUpdated', () => {
  it('returns processed=false when uid metadata missing', async () => {
    const r = await handleSubscriptionUpdated(makeSub({ metadata: {} }));
    expect(r).toEqual({
      processed: false,
      reason: 'Missing uid in subscription metadata',
    });
    expect(mGetRow).not.toHaveBeenCalled();
    expect(mUpdate).not.toHaveBeenCalled();
  });

  it('returns processed=false when user row missing', async () => {
    mGetRow.mockResolvedValue(null);

    const r = await handleSubscriptionUpdated(makeSub());
    expect(r).toEqual({ processed: false, reason: 'User not found' });
    expect(mUpdate).not.toHaveBeenCalled();
  });

  it('writes plan/credits snapshot + cancel state from the row', async () => {
    mGetRow.mockResolvedValue(ROW_BASE);
    mUpdate.mockResolvedValue();

    const r = await handleSubscriptionUpdated(makeSub());

    expect(r).toEqual({ processed: true });
    expect(mUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: 'uid-1',
        plan: 'pro_s',
        planCredits: 500,
        planExpiredAt: '2024-07-01T00:00:00.000Z',
        cancelAtPeriodEnd: false,
        stripeSubscriptionId: 'sub_xyz',
        nextYearlyCreditGrantAt: null,
        yearlyCreditGrantAnchorDay: null,
      }),
    );
  });

  it('falls back to Stripe.subscriptions.retrieve when periodEnd missing', async () => {
    mGetRow.mockResolvedValue(ROW_BASE);
    mUpdate.mockResolvedValue();
    const retrieve = jest.fn().mockResolvedValue({
      id: 'sub_xyz',
      current_period_end: 1722470400, // 2024-08-01
    });
    mGetStripe.mockReturnValue({
      subscriptions: { retrieve },
    } as unknown as ReturnType<typeof getStripeClient>);

    await handleSubscriptionUpdated(makeSub({ currentPeriodEnd: null }));

    expect(retrieve).toHaveBeenCalledWith('sub_xyz');
    expect(mUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        planExpiredAt: '2024-08-01T00:00:00.000Z',
      }),
    );
  });

  it('forwards cancelAtPeriodEnd=true', async () => {
    mGetRow.mockResolvedValue(ROW_BASE);
    mUpdate.mockResolvedValue();

    await handleSubscriptionUpdated(makeSub({ cancelAtPeriodEnd: true }));

    expect(mUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ cancelAtPeriodEnd: true }),
    );
  });

  it('forwards cycle resolved from metadata.billing_cycle', async () => {
    mGetRow.mockResolvedValue(ROW_BASE);
    mUpdate.mockResolvedValue();

    await handleSubscriptionUpdated(
      makeSub({ metadata: { uid: 'uid-1', billing_cycle: 'yearly' } }),
    );

    expect(mUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ subscriptionBillingCycle: 'yearly' }),
    );
  });

  it('preserves nextYearlyCreditGrantAt and anchor from the row', async () => {
    const yearlyRow = {
      plan: 'pro_s',
      planCredits: 500,
      nextYearlyCreditGrantAt: new Date('2026-06-15T00:00:00Z'),
      yearlyCreditGrantAnchorDay: 15,
    };
    mGetRow.mockResolvedValue(yearlyRow);
    mUpdate.mockResolvedValue();

    await handleSubscriptionUpdated(makeSub());

    expect(mUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        nextYearlyCreditGrantAt: yearlyRow.nextYearlyCreditGrantAt,
        yearlyCreditGrantAnchorDay: 15,
      }),
    );
  });
});
