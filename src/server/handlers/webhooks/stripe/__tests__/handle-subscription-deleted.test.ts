/**
 * `customer.subscription.deleted` webhook → downgrade user to free plan.
 *
 * Coverage:
 *   - missing uid metadata → not processed
 *   - happy path: writes free plan + nulls all subscription/yearly columns,
 *     then sets the next free monthly grant cursor
 */

jest.mock('../../../../services/billing/db-mirror', () => ({
  __esModule: true,
  updateUserPlanFields: jest.fn(),
}));

jest.mock('../../../../services/credits', () => ({
  __esModule: true,
  resetUserCredits: jest.fn(),
}));

jest.mock('../../../../services/free-monthly-credits', () => ({
  __esModule: true,
  setNextFreeCreditGrantAtOnly: jest.fn(),
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

import { handleSubscriptionDeleted } from '@/server/handlers/webhooks/stripe/handle-subscription-deleted';
import { updateUserPlanFields } from '@/server/services/billing/db-mirror';
import { setNextFreeCreditGrantAtOnly } from '@/server/services/free-monthly-credits';

import type Stripe from 'stripe';

const mUpdate = updateUserPlanFields as jest.MockedFunction<
  typeof updateUserPlanFields
>;
const mSetNextFree = setNextFreeCreditGrantAtOnly as jest.MockedFunction<
  typeof setNextFreeCreditGrantAtOnly
>;

beforeEach(() => {
  jest.resetAllMocks();
});

function makeSub(metadata?: Record<string, string>): Stripe.Subscription {
  return {
    id: 'sub_xyz',
    customer: 'cus_xyz',
    status: 'canceled',
    metadata,
  } as unknown as Stripe.Subscription;
}

describe('handleSubscriptionDeleted', () => {
  it('returns processed=false when uid metadata missing', async () => {
    const r = await handleSubscriptionDeleted(makeSub());
    expect(r).toEqual({
      processed: false,
      reason: 'Missing uid in subscription metadata',
    });
    expect(mUpdate).not.toHaveBeenCalled();
    expect(mSetNextFree).not.toHaveBeenCalled();
  });

  it('downgrades user to free plan and nulls subscription columns', async () => {
    mUpdate.mockResolvedValue();
    mSetNextFree.mockResolvedValue();

    const r = await handleSubscriptionDeleted(makeSub({ uid: 'uid-1' }));

    expect(r).toEqual({ processed: true });
    expect(mUpdate).toHaveBeenCalledWith({
      uid: 'uid-1',
      plan: 'free',
      planCredits: 0,
      planExpiredAt: null,
      cancelAtPeriodEnd: false,
      subscriptionBillingCycle: null,
      stripeSubscriptionId: null,
      nextYearlyCreditGrantAt: null,
      yearlyCreditGrantAnchorDay: null,
    });
  });

  it('sets the next free monthly grant cursor with anchor=today.UTC.day', async () => {
    mUpdate.mockResolvedValue();
    mSetNextFree.mockResolvedValue();

    const before = new Date();
    await handleSubscriptionDeleted(makeSub({ uid: 'uid-1' }));
    const after = new Date();

    expect(mSetNextFree).toHaveBeenCalledTimes(1);
    const [uid, nextDate, anchorDay] = mSetNextFree.mock.calls[0];
    expect(uid).toBe('uid-1');
    expect(nextDate).toBeInstanceOf(Date);
    // anchor is today's UTC day (1..31)
    expect(typeof anchorDay).toBe('number');
    expect(anchorDay).toBeGreaterThanOrEqual(1);
    expect(anchorDay).toBeLessThanOrEqual(31);
    // next cursor is roughly one month into the future (within bounds)
    const oneMonthMs = 25 * 24 * 60 * 60 * 1000;
    expect((nextDate as Date).getTime() - before.getTime()).toBeGreaterThan(
      oneMonthMs,
    );
    expect((nextDate as Date).getTime() - after.getTime()).toBeLessThan(
      32 * 24 * 60 * 60 * 1000,
    );
  });
});
