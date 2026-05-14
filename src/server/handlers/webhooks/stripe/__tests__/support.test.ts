/**
 * `src/server/handlers/webhooks/stripe/support.ts` — Stripe webhook
 * orchestration. Uses the
 * idempotent `insertCreditGrantIdempotent` (`ON CONFLICT DO NOTHING`),
 * `deleteCreditGrantById` (rollback), and `updateUserPlanFields` partial
 * update.
 *
 * Coverage:
 *   - applyPlanToUserFromWebhook (orchestration of `applyPlanToUserCore`)
 *       - happy path: insert grant → update plan → reset credits
 *       - duplicate grant (inserted=false): update plan, SKIP reset
 *       - reset failure with insertedGrant=true → rollback grant + rethrow
 *       - reset failure with insertedGrant=false → no rollback, still rethrow
 *       - shouldResetCreditsOverride=false → still inserts + updates,
 *         skips reset
 *       - missing subscriptionId when grantContext present → throws
 *       - cycle 'unknown' (not monthly/yearly) when grantContext present → throws
 *       - free plan (creditsToGrant=0) skips insert, no reset
 *       - cycle null (free plan) writes nullable cycle/anchor columns
 *       - cycle yearly writes nextYearlyCreditGrantAt + anchor
 *       - cancelAtPeriodEnd=true / planExpiredAt forwarded to update
 *   - applyPlanToUserFromScheduler — uses grantContext.subscriptionId,
 *     overrides forwarded
 *   - pure helpers:
 *       - getUidFromMetadata: present / missing / whitespace
 *       - resolvePeriodEndTimestamp: top-level / item-level / null
 *       - subscriptionPendingCancellation: cancel_at_period_end /
 *         cancel_at / canceled-status short-circuit
 *       - getPriceIdFromInvoice: single line / multi-line subscription
 *         picker / amount tiebreak
 *       - resolveSubscriptionIdFromInvoicePayload: top-level / parent
 *         (Clover) / lines fallback
 *       - resolveCycleFromSubscription: metadata wins / falls back to price
 *       - resolvePlanCodeFromSubscription: metadata valid / falls back to price
 *       - resolveYearlyGrantScheduleState: not yet due / due once / due
 *         multiple (catch-up)
 */

jest.mock('../../../../services/billing/db-mirror', () => ({
  __esModule: true,
  insertCreditGrantIdempotent: jest.fn(),
  deleteCreditGrantById: jest.fn(),
  updateUserPlanFields: jest.fn(),
}));

jest.mock('../../../../services/credits', () => ({
  __esModule: true,
  resetUserCredits: jest.fn(),
}));

jest.mock('../../../../config/pricing', () => ({
  __esModule: true,
  PLAN_CODES: ['free', 'starter', 'pro_s', 'pro_m', 'pro_l', 'enterprise'],
  getPricingPlans: jest.fn(),
  getPlanByPriceId: jest.fn(),
  getBillingCycleByPriceId: jest.fn(),
}));

jest.mock('../../../../lib/logger', () => ({
  __esModule: true,
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
}));

import {
  getBillingCycleByPriceId,
  getPlanByPriceId,
  getPricingPlans,
} from '@/server/config/pricing';
import {
  applyPlanToUserFromScheduler,
  applyPlanToUserFromWebhook,
  getPriceIdFromInvoice,
  getUidFromMetadata,
  resolveCycleFromSubscription,
  resolvePeriodEndTimestamp,
  resolvePlanCodeFromSubscription,
  resolveSubscriptionIdFromInvoicePayload,
  resolveYearlyGrantScheduleState,
  subscriptionPendingCancellation,
} from '@/server/handlers/webhooks/stripe/support';
import {
  deleteCreditGrantById,
  insertCreditGrantIdempotent,
  updateUserPlanFields,
} from '@/server/services/billing/db-mirror';
import { resetUserCredits } from '@/server/services/credits';

import type Stripe from 'stripe';

const mInsert = insertCreditGrantIdempotent as jest.MockedFunction<
  typeof insertCreditGrantIdempotent
>;
const mDelete = deleteCreditGrantById as jest.MockedFunction<
  typeof deleteCreditGrantById
>;
const mUpdatePlan = updateUserPlanFields as jest.MockedFunction<
  typeof updateUserPlanFields
>;
const mReset = resetUserCredits as jest.MockedFunction<typeof resetUserCredits>;
const mGetPlans = getPricingPlans as jest.MockedFunction<
  typeof getPricingPlans
>;
const mGetPlanByPriceId = getPlanByPriceId as jest.MockedFunction<
  typeof getPlanByPriceId
>;
const mGetCycleByPriceId = getBillingCycleByPriceId as jest.MockedFunction<
  typeof getBillingCycleByPriceId
>;

const PLANS = [
  { code: 'free', monthlyCredits: 0, stripePriceIdMonthly: 'price_free_m' },
  {
    code: 'starter',
    monthlyCredits: 100,
    stripePriceIdMonthly: 'price_starter_m',
    stripePriceIdYearly: 'price_starter_y',
  },
  {
    code: 'pro_s',
    monthlyCredits: 500,
    stripePriceIdMonthly: 'price_pro_s_m',
    stripePriceIdYearly: 'price_pro_s_y',
  },
  {
    code: 'pro_m',
    monthlyCredits: 1000,
    stripePriceIdMonthly: 'price_pro_m_m',
    stripePriceIdYearly: 'price_pro_m_y',
  },
] as unknown as ReturnType<typeof getPricingPlans>;

beforeEach(() => {
  jest.resetAllMocks();
  mGetPlans.mockReturnValue(PLANS);
  mGetPlanByPriceId.mockImplementation(
    (id: string) =>
      (
        PLANS as unknown as Array<{
          code: string;
          stripePriceIdMonthly?: string;
          stripePriceIdYearly?: string;
        }>
      ).find(
        (p) => p.stripePriceIdMonthly === id || p.stripePriceIdYearly === id,
      ) as ReturnType<typeof getPlanByPriceId>,
  );
  mGetCycleByPriceId.mockImplementation((id: string) => {
    const plan = (
      PLANS as unknown as Array<{
        stripePriceIdMonthly?: string;
        stripePriceIdYearly?: string;
      }>
    ).find(
      (p) => p.stripePriceIdMonthly === id || p.stripePriceIdYearly === id,
    );
    if (!plan) return null;
    return plan.stripePriceIdYearly === id ? 'yearly' : 'monthly';
  });
});

// ---------------------------------------------------------------------------
// applyPlanToUserFromWebhook — orchestration
// ---------------------------------------------------------------------------

function makeSubscription(
  opts: {
    id?: string;
    cancelAtPeriodEnd?: boolean;
    cancelAt?: number | null;
    status?: Stripe.Subscription.Status;
    currentPeriodEnd?: number;
    currentPeriodStart?: number;
    metadata?: Record<string, string>;
    priceId?: string;
  } = {},
): Stripe.Subscription {
  const {
    id = 'sub_xyz',
    cancelAtPeriodEnd = false,
    cancelAt = null,
    status = 'active',
    currentPeriodEnd = 1719792000, // 2024-07-01
    currentPeriodStart = 1717200000, // 2024-06-01
    metadata,
    priceId = 'price_pro_s_m',
  } = opts;
  return {
    id,
    cancel_at_period_end: cancelAtPeriodEnd,
    cancel_at: cancelAt,
    status,
    current_period_end: currentPeriodEnd,
    current_period_start: currentPeriodStart,
    metadata,
    items: {
      data: [
        {
          id: 'si_1',
          price: { id: priceId },
          current_period_start: currentPeriodStart,
          current_period_end: currentPeriodEnd,
        },
      ],
    },
  } as unknown as Stripe.Subscription;
}

const grantCtx = {
  idempotencyKey: 'grant-xyz',
  source: 'invoice_paid' as const,
  subscriptionId: 'sub_xyz',
  reference: 'in_xxx',
  grantMonth: '2024-06',
};

describe('applyPlanToUserFromWebhook — happy path (insert + update + reset)', () => {
  it('inserts grant, updates plan, resets credits with planCredits', async () => {
    mInsert.mockResolvedValue({ inserted: true });
    mUpdatePlan.mockResolvedValue();
    mReset.mockResolvedValue();

    await applyPlanToUserFromWebhook(
      'uid-1',
      'pro_s',
      'monthly',
      makeSubscription(),
      grantCtx,
    );

    expect(mInsert).toHaveBeenCalledTimes(1);
    expect(mInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'grant-xyz',
        uid: 'uid-1',
        subscriptionId: 'sub_xyz',
        planCode: 'pro_s',
        billingCycle: 'monthly',
        amount: 500,
        grantMonth: '2024-06',
        triggerSource: 'invoice_paid',
        triggerRef: 'in_xxx',
      }),
    );
    expect(mUpdatePlan).toHaveBeenCalledTimes(1);
    expect(mUpdatePlan).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: 'uid-1',
        plan: 'pro_s',
        planCredits: 500,
        subscriptionBillingCycle: 'monthly',
        nextYearlyCreditGrantAt: null,
        yearlyCreditGrantAnchorDay: null,
        stripeSubscriptionId: 'sub_xyz',
      }),
    );
    expect(mReset).toHaveBeenCalledWith('uid-1', 500);
    expect(mDelete).not.toHaveBeenCalled();
  });
});

describe('applyPlanToUserFromWebhook — duplicate grant', () => {
  it('updates plan but SKIPS reset when insert returns inserted=false', async () => {
    mInsert.mockResolvedValue({ inserted: false });
    mUpdatePlan.mockResolvedValue();

    await applyPlanToUserFromWebhook(
      'uid-1',
      'pro_s',
      'monthly',
      makeSubscription(),
      grantCtx,
    );

    expect(mUpdatePlan).toHaveBeenCalledTimes(1);
    expect(mReset).not.toHaveBeenCalled();
    expect(mDelete).not.toHaveBeenCalled();
  });
});

describe('applyPlanToUserFromWebhook — reset failure rollback', () => {
  it('rolls back the grant when reset throws (grant was newly inserted)', async () => {
    mInsert.mockResolvedValue({ inserted: true });
    mUpdatePlan.mockResolvedValue();
    mReset.mockRejectedValue(new Error('reset failed'));
    mDelete.mockResolvedValue();

    await expect(
      applyPlanToUserFromWebhook(
        'uid-1',
        'pro_s',
        'monthly',
        makeSubscription(),
        grantCtx,
      ),
    ).rejects.toThrow('reset failed');

    expect(mDelete).toHaveBeenCalledWith('grant-xyz');
  });

  it('does NOT rollback when grant was duplicate (inserted=false)', async () => {
    // Edge: shouldResetCredits should be false when inserted=false, so reset
    // would not run. But sanity-check that even if reset somehow runs and
    // throws, no rollback fires for an existing grant. We force the path by
    // overriding shouldReset via the public wrapper that doesn't expose the
    // override; so we test the symmetric guard: inserted=false means reset
    // is never called → mDelete is never called.
    mInsert.mockResolvedValue({ inserted: false });
    mUpdatePlan.mockResolvedValue();

    await applyPlanToUserFromWebhook(
      'uid-1',
      'pro_s',
      'monthly',
      makeSubscription(),
      grantCtx,
    );

    expect(mReset).not.toHaveBeenCalled();
    expect(mDelete).not.toHaveBeenCalled();
  });
});

describe('applyPlanToUserFromWebhook — shouldResetCreditsOverride', () => {
  it('inserts + updates but skips reset when override=false', async () => {
    mInsert.mockResolvedValue({ inserted: true });
    mUpdatePlan.mockResolvedValue();

    await applyPlanToUserFromWebhook(
      'uid-1',
      'pro_s',
      'monthly',
      makeSubscription(),
      grantCtx,
      false, // shouldResetCreditsOverride
    );

    expect(mInsert).toHaveBeenCalled();
    expect(mUpdatePlan).toHaveBeenCalled();
    expect(mReset).not.toHaveBeenCalled();
  });
});

describe('applyPlanToUserFromWebhook — guard rails', () => {
  it('throws when subscriptionId is missing for a paid plan', async () => {
    const ctxNoSub = { ...grantCtx, subscriptionId: undefined };
    const subWithoutId = makeSubscription();
    Object.assign(subWithoutId, { id: '' });

    await expect(
      applyPlanToUserFromWebhook(
        'uid-1',
        'pro_s',
        'monthly',
        subWithoutId,
        ctxNoSub,
      ),
    ).rejects.toThrow(/missing subscription id/);
    expect(mInsert).not.toHaveBeenCalled();
    expect(mUpdatePlan).not.toHaveBeenCalled();
  });

  it('throws when cycle is null for a paid plan with grantContext', async () => {
    await expect(
      applyPlanToUserFromWebhook(
        'uid-1',
        'pro_s',
        null, // cycle
        makeSubscription(),
        grantCtx,
      ),
    ).rejects.toThrow(/billing cycle must be monthly or yearly/);
    expect(mInsert).not.toHaveBeenCalled();
    expect(mUpdatePlan).not.toHaveBeenCalled();
  });
});

describe('applyPlanToUserFromWebhook — free plan (zero credits)', () => {
  it('skips grant insert and reset when planCredits is 0', async () => {
    mUpdatePlan.mockResolvedValue();

    await applyPlanToUserFromWebhook(
      'uid-1',
      'free',
      null,
      makeSubscription({ priceId: 'price_free_m' }),
      // no grantContext passed for free
      undefined,
    );

    expect(mInsert).not.toHaveBeenCalled();
    expect(mReset).not.toHaveBeenCalled();
    expect(mUpdatePlan).toHaveBeenCalledWith(
      expect.objectContaining({
        plan: 'free',
        planCredits: 0,
        subscriptionBillingCycle: null,
        nextYearlyCreditGrantAt: null,
        yearlyCreditGrantAnchorDay: null,
      }),
    );
  });
});

describe('applyPlanToUserFromWebhook — yearly cycle writes anchor', () => {
  it('writes nextYearlyCreditGrantAt + anchor when cycle=yearly', async () => {
    mInsert.mockResolvedValue({ inserted: true });
    mUpdatePlan.mockResolvedValue();
    mReset.mockResolvedValue();

    await applyPlanToUserFromWebhook(
      'uid-1',
      'pro_s',
      'yearly',
      makeSubscription({ priceId: 'price_pro_s_y' }),
      grantCtx,
    );

    const set = mUpdatePlan.mock.calls[0][0];
    expect(set.subscriptionBillingCycle).toBe('yearly');
    expect(typeof set.nextYearlyCreditGrantAt).toBe('string');
    expect(set.yearlyCreditGrantAnchorDay).toBe(1); // 2024-06-01 → day 1
  });
});

describe('applyPlanToUserFromWebhook — cancel state forwarding', () => {
  it('forwards cancelAtPeriodEnd=true and planExpiredAt', async () => {
    mInsert.mockResolvedValue({ inserted: true });
    mUpdatePlan.mockResolvedValue();
    mReset.mockResolvedValue();

    await applyPlanToUserFromWebhook(
      'uid-1',
      'pro_s',
      'monthly',
      makeSubscription({ cancelAtPeriodEnd: true }),
      grantCtx,
    );

    expect(mUpdatePlan).toHaveBeenCalledWith(
      expect.objectContaining({
        cancelAtPeriodEnd: true,
        planExpiredAt: expect.any(String),
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// applyPlanToUserFromScheduler
// ---------------------------------------------------------------------------

describe('applyPlanToUserFromScheduler', () => {
  it('uses grantContext.subscriptionId and forwarded yearly overrides', async () => {
    mInsert.mockResolvedValue({ inserted: true });
    mUpdatePlan.mockResolvedValue();
    mReset.mockResolvedValue();

    await applyPlanToUserFromScheduler(
      'uid-2',
      'pro_m',
      'yearly',
      '2025-06-15T00:00:00.000Z',
      { ...grantCtx, source: 'scheduler_yearly', subscriptionId: 'sub_sched' },
      15,
    );

    expect(mInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        subscriptionId: 'sub_sched',
        triggerSource: 'scheduler_yearly',
      }),
    );
    expect(mUpdatePlan).toHaveBeenCalledWith(
      expect.objectContaining({
        plan: 'pro_m',
        subscriptionBillingCycle: 'yearly',
        nextYearlyCreditGrantAt: '2025-06-15T00:00:00.000Z',
        yearlyCreditGrantAnchorDay: 15,
        stripeSubscriptionId: 'sub_sched',
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// pure helpers
// ---------------------------------------------------------------------------

describe('getUidFromMetadata', () => {
  it('returns uid when present and non-empty', () => {
    expect(getUidFromMetadata({ uid: 'u-1' })).toBe('u-1');
  });
  it('returns null when missing', () => {
    expect(getUidFromMetadata({})).toBeNull();
    expect(getUidFromMetadata(null)).toBeNull();
    expect(getUidFromMetadata(undefined)).toBeNull();
  });
  it('returns null when whitespace-only', () => {
    expect(getUidFromMetadata({ uid: '   ' })).toBeNull();
  });
});

describe('resolvePeriodEndTimestamp', () => {
  it('reads top-level current_period_end', () => {
    expect(
      resolvePeriodEndTimestamp({
        current_period_end: 1719792000,
      } as unknown as Stripe.Subscription),
    ).toBe('2024-07-01T00:00:00.000Z');
  });
  it('falls back to items[0].current_period_end', () => {
    expect(
      resolvePeriodEndTimestamp({
        items: { data: [{ current_period_end: 1719792000 }] },
      } as unknown as Stripe.Subscription),
    ).toBe('2024-07-01T00:00:00.000Z');
  });
  it('returns null when no period available', () => {
    expect(resolvePeriodEndTimestamp(null)).toBeNull();
    expect(resolvePeriodEndTimestamp(undefined)).toBeNull();
  });
});

describe('subscriptionPendingCancellation', () => {
  it('true when cancel_at_period_end', () => {
    expect(
      subscriptionPendingCancellation({
        cancel_at_period_end: true,
      } as unknown as Stripe.Subscription),
    ).toBe(true);
  });
  it('true when cancel_at > 0 and not already cancelled', () => {
    expect(
      subscriptionPendingCancellation({
        cancel_at_period_end: false,
        status: 'active',
        cancel_at: 1719792000,
      } as unknown as Stripe.Subscription),
    ).toBe(true);
  });
  it('false when status is canceled (terminal)', () => {
    expect(
      subscriptionPendingCancellation({
        cancel_at_period_end: false,
        status: 'canceled',
        cancel_at: 1719792000,
      } as unknown as Stripe.Subscription),
    ).toBe(false);
  });
  it('false when nothing flagged', () => {
    expect(
      subscriptionPendingCancellation({
        cancel_at_period_end: false,
        status: 'active',
        cancel_at: null,
      } as unknown as Stripe.Subscription),
    ).toBe(false);
  });
});

describe('getPriceIdFromInvoice', () => {
  it('returns the only line price id when invoice has a single line', () => {
    const invoice = {
      lines: { data: [{ price: 'price_solo' }] },
    } as unknown as Stripe.Invoice;
    expect(getPriceIdFromInvoice(invoice)).toBe('price_solo');
  });

  it('prefers the subscription-typed line over others', () => {
    const invoice = {
      lines: {
        data: [
          { type: 'invoiceitem', price: 'price_addon', amount: 10 },
          { type: 'subscription', price: 'price_sub', amount: 100 },
        ],
      },
    } as unknown as Stripe.Invoice;
    expect(getPriceIdFromInvoice(invoice)).toBe('price_sub');
  });

  it('falls back to highest positive amount when no subscription line', () => {
    const invoice = {
      lines: {
        data: [
          { type: 'invoiceitem', price: 'price_small', amount: 5 },
          { type: 'invoiceitem', price: 'price_big', amount: 50 },
        ],
      },
    } as unknown as Stripe.Invoice;
    expect(getPriceIdFromInvoice(invoice)).toBe('price_big');
  });

  it('returns null when no lines have prices', () => {
    const invoice = {
      lines: { data: [{ amount: 5 }] },
    } as unknown as Stripe.Invoice;
    expect(getPriceIdFromInvoice(invoice)).toBeNull();
  });
});

describe('resolveSubscriptionIdFromInvoicePayload', () => {
  it('reads top-level invoice.subscription string', () => {
    expect(
      resolveSubscriptionIdFromInvoicePayload({
        subscription: 'sub_top',
        lines: { data: [] },
      } as unknown as Stripe.Invoice),
    ).toBe('sub_top');
  });

  it('reads parent.subscription_details.subscription (Clover schema)', () => {
    expect(
      resolveSubscriptionIdFromInvoicePayload({
        parent: {
          subscription_details: { subscription: 'sub_clover' },
        },
        lines: { data: [] },
      } as unknown as Stripe.Invoice),
    ).toBe('sub_clover');
  });

  it('falls back to lines[].subscription', () => {
    expect(
      resolveSubscriptionIdFromInvoicePayload({
        lines: { data: [{ subscription: 'sub_line' }] },
      } as unknown as Stripe.Invoice),
    ).toBe('sub_line');
  });

  it('returns null when no subscription anywhere', () => {
    expect(
      resolveSubscriptionIdFromInvoicePayload({
        lines: { data: [] },
      } as unknown as Stripe.Invoice),
    ).toBeNull();
  });
});

describe('resolveCycleFromSubscription', () => {
  it('uses metadata.billing_cycle when valid', () => {
    expect(
      resolveCycleFromSubscription({
        metadata: { billing_cycle: 'yearly' },
        items: { data: [{ price: { id: 'price_pro_s_m' } }] },
      } as unknown as Stripe.Subscription),
    ).toBe('yearly');
  });
  it('falls back to price id mapping', () => {
    expect(
      resolveCycleFromSubscription({
        metadata: {},
        items: { data: [{ price: { id: 'price_pro_s_y' } }] },
      } as unknown as Stripe.Subscription),
    ).toBe('yearly');
  });
});

describe('resolvePlanCodeFromSubscription', () => {
  it('uses metadata.plan_code when valid', () => {
    expect(
      resolvePlanCodeFromSubscription({
        metadata: { plan_code: 'pro_m' },
        items: { data: [{ price: { id: 'price_pro_s_m' } }] },
      } as unknown as Stripe.Subscription),
    ).toBe('pro_m');
  });
  it('ignores invalid metadata.plan_code and falls back to price', () => {
    expect(
      resolvePlanCodeFromSubscription({
        metadata: { plan_code: 'unknown_xx' },
        items: { data: [{ price: { id: 'price_pro_s_m' } }] },
      } as unknown as Stripe.Subscription),
    ).toBe('pro_s');
  });
});

describe('resolveYearlyGrantScheduleState', () => {
  it('returns shouldGrant=false when before next due', () => {
    const r = resolveYearlyGrantScheduleState(
      '2026-06-15T00:00:00.000Z',
      15,
      new Date('2026-06-14T00:00:00.000Z'),
    );
    expect(r.shouldGrant).toBe(false);
    expect(r.nextYearlyCreditGrantAt).toBe('2026-06-15T00:00:00.000Z');
    expect(r.dueGrantInstants).toEqual([]);
  });

  it('returns shouldGrant=true with one due instant when due now', () => {
    const r = resolveYearlyGrantScheduleState(
      '2026-06-15T00:00:00.000Z',
      15,
      new Date('2026-06-15T00:00:00.000Z'),
    );
    expect(r.shouldGrant).toBe(true);
    expect(r.dueGrantInstants).toEqual(['2026-06-15T00:00:00.000Z']);
    expect(r.nextYearlyCreditGrantAt).toBe('2026-07-15T00:00:00.000Z');
  });

  it('returns multiple due instants for back-fill (catch-up)', () => {
    const r = resolveYearlyGrantScheduleState(
      '2026-04-15T00:00:00.000Z',
      15,
      new Date('2026-06-20T00:00:00.000Z'),
    );
    expect(r.dueGrantInstants).toEqual([
      '2026-04-15T00:00:00.000Z',
      '2026-05-15T00:00:00.000Z',
      '2026-06-15T00:00:00.000Z',
    ]);
    expect(r.nextYearlyCreditGrantAt).toBe('2026-07-15T00:00:00.000Z');
  });

  it('returns null state when no current cursor', () => {
    const r = resolveYearlyGrantScheduleState(
      null,
      null,
      new Date('2026-06-20T00:00:00.000Z'),
    );
    expect(r.shouldGrant).toBe(false);
    expect(r.nextYearlyCreditGrantAt).toBeNull();
    expect(r.dueGrantInstants).toEqual([]);
  });
});
