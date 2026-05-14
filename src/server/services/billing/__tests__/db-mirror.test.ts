/**
 * `src/server/services/billing/db-mirror.ts` — drizzle helpers backing the
 * Stripe webhook and billing portal.
 *
 * Coverage:
 *   - users / Stripe customer cache: select shape, write payload
 *   - users / billing sync snapshot: column projection
 *   - users / plan partial-update: explicit-null wipes, omitted preserves,
 *     mixed Date/ISO string coercion, no-op when payload is empty
 *   - users / next-free-grant cursor: both columns always written
 *   - credit_grants idempotent insert: returning shape → inserted boolean
 *   - credit_grants delete: where shape
 */

interface SelectCall {
  cols: Record<string, unknown>;
  table: unknown;
  where: unknown;
  limit: number | null;
}

interface UpdateCall {
  table: unknown;
  set: Record<string, unknown> | undefined;
  where: unknown;
}

interface InsertCall {
  table: unknown;
  values: Record<string, unknown> | undefined;
  onConflictTarget: unknown;
  returning: Record<string, unknown> | undefined;
}

interface DeleteCall {
  table: unknown;
  where: unknown;
}

let selectCalls: SelectCall[];
let updateCalls: UpdateCall[];
let insertCalls: InsertCall[];
let deleteCalls: DeleteCall[];

let nextSelectRows: unknown[];
let nextInsertReturning: unknown[];
let nextSelectError: Error | null;
let nextUpdateError: Error | null;
let nextInsertError: Error | null;
let nextDeleteError: Error | null;

function makeStubDb() {
  return {
    select(cols: Record<string, unknown>) {
      const call: SelectCall = {
        cols,
        table: undefined,
        where: undefined,
        limit: null,
      };
      selectCalls.push(call);
      return {
        from(table: unknown) {
          call.table = table;
          return {
            where(pred: unknown) {
              call.where = pred;
              return {
                limit(n: number) {
                  call.limit = n;
                  if (nextSelectError) return Promise.reject(nextSelectError);
                  return Promise.resolve(nextSelectRows);
                },
              };
            },
          };
        },
      };
    },
    update(table: unknown) {
      const call: UpdateCall = { table, set: undefined, where: undefined };
      updateCalls.push(call);
      return {
        set(s: Record<string, unknown>) {
          call.set = s;
          return {
            where(pred: unknown) {
              call.where = pred;
              if (nextUpdateError) return Promise.reject(nextUpdateError);
              return Promise.resolve([]);
            },
          };
        },
      };
    },
    insert(table: unknown) {
      const call: InsertCall = {
        table,
        values: undefined,
        onConflictTarget: undefined,
        returning: undefined,
      };
      insertCalls.push(call);
      return {
        values(v: Record<string, unknown>) {
          call.values = v;
          return {
            onConflictDoNothing(opts: { target: unknown }) {
              call.onConflictTarget = opts.target;
              return {
                returning(r: Record<string, unknown>) {
                  call.returning = r;
                  if (nextInsertError) return Promise.reject(nextInsertError);
                  return Promise.resolve(nextInsertReturning);
                },
              };
            },
          };
        },
      };
    },
    delete(table: unknown) {
      const call: DeleteCall = { table, where: undefined };
      deleteCalls.push(call);
      return {
        where(pred: unknown) {
          call.where = pred;
          if (nextDeleteError) return Promise.reject(nextDeleteError);
          return Promise.resolve([]);
        },
      };
    },
  };
}

let stubDb = makeStubDb();

jest.mock('@repo/db', () => ({
  __esModule: true,
  getDbHttp: jest.fn(() => stubDb),
}));

jest.mock('@repo/db/schema', () => ({
  __esModule: true,
  users: {
    uid: '__users_uid__',
    plan: '__users_plan__',
    planCredits: '__users_planCredits__',
    planExpiredAt: '__users_planExpiredAt__',
    cancelAtPeriodEnd: '__users_cancelAtPeriodEnd__',
    subscriptionBillingCycle: '__users_subscriptionBillingCycle__',
    stripeSubscriptionId: '__users_stripeSubscriptionId__',
    nextYearlyCreditGrantAt: '__users_nextYearlyCreditGrantAt__',
    yearlyCreditGrantAnchorDay: '__users_yearlyCreditGrantAnchorDay__',
    stripeCustomerId: '__users_stripeCustomerId__',
    nextFreeCreditGrantAt: '__users_nextFreeCreditGrantAt__',
    freeCreditGrantAnchorDay: '__users_freeCreditGrantAnchorDay__',
  },
  creditGrants: {
    id: '__creditGrants_id__',
  },
}));

import {
  deleteCreditGrantById,
  getUserBillingSyncState,
  getUserStripeCustomerIdRow,
  insertCreditGrantIdempotent,
  setUserStripeCustomerId,
  updateUserNextFreeCreditGrantAt,
  updateUserPlanFields,
} from '@/server/services/billing/db-mirror';

beforeEach(() => {
  selectCalls = [];
  updateCalls = [];
  insertCalls = [];
  deleteCalls = [];
  nextSelectRows = [];
  nextInsertReturning = [];
  nextSelectError = null;
  nextUpdateError = null;
  nextInsertError = null;
  nextDeleteError = null;
  stubDb = makeStubDb();
});

// ---------------------------------------------------------------------------
// users — Stripe customer cache
// ---------------------------------------------------------------------------

describe('getUserStripeCustomerIdRow', () => {
  it('selects only stripeCustomerId column with limit 1', async () => {
    nextSelectRows = [{ stripeCustomerId: 'cus_123' }];
    const row = await getUserStripeCustomerIdRow('uid-1');
    expect(row).toEqual({ stripeCustomerId: 'cus_123' });
    expect(selectCalls[0].cols).toEqual({
      stripeCustomerId: '__users_stripeCustomerId__',
    });
    expect(selectCalls[0].limit).toBe(1);
  });

  it('returns null when no row matches', async () => {
    nextSelectRows = [];
    const row = await getUserStripeCustomerIdRow('uid-x');
    expect(row).toBeNull();
  });
});

describe('setUserStripeCustomerId', () => {
  it('writes only the stripeCustomerId column', async () => {
    await setUserStripeCustomerId('uid-1', 'cus_999');
    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0].set).toEqual({ stripeCustomerId: 'cus_999' });
  });
});

// ---------------------------------------------------------------------------
// users — billing sync snapshot
// ---------------------------------------------------------------------------

describe('getUserBillingSyncState', () => {
  it('projects exactly the four sync columns', async () => {
    const now = new Date('2026-04-24T00:00:00Z');
    nextSelectRows = [
      {
        plan: 'pro_m',
        planCredits: 1000,
        nextYearlyCreditGrantAt: now,
        yearlyCreditGrantAnchorDay: 24,
      },
    ];
    const row = await getUserBillingSyncState('uid-1');
    expect(row).toEqual({
      plan: 'pro_m',
      planCredits: 1000,
      nextYearlyCreditGrantAt: now,
      yearlyCreditGrantAnchorDay: 24,
    });
    expect(Object.keys(selectCalls[0].cols)).toEqual([
      'plan',
      'planCredits',
      'nextYearlyCreditGrantAt',
      'yearlyCreditGrantAnchorDay',
    ]);
  });

  it('returns null when user does not exist', async () => {
    nextSelectRows = [];
    const row = await getUserBillingSyncState('missing');
    expect(row).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// users — plan partial update
// ---------------------------------------------------------------------------

describe('updateUserPlanFields — partial update semantics', () => {
  it('writes only fields explicitly present in input', async () => {
    await updateUserPlanFields({
      uid: 'uid-1',
      plan: 'pro_s',
      planCredits: 200,
    });
    expect(updateCalls[0].set).toEqual({
      plan: 'pro_s',
      planCredits: 200,
    });
  });

  it('writes explicit `null` (wipes column) for nullable fields', async () => {
    await updateUserPlanFields({
      uid: 'uid-2',
      planExpiredAt: null,
      subscriptionBillingCycle: null,
      stripeSubscriptionId: null,
      nextYearlyCreditGrantAt: null,
      yearlyCreditGrantAnchorDay: null,
    });
    expect(updateCalls[0].set).toEqual({
      planExpiredAt: null,
      subscriptionBillingCycle: null,
      stripeSubscriptionId: null,
      nextYearlyCreditGrantAt: null,
      yearlyCreditGrantAnchorDay: null,
    });
  });

  it('coerces ISO date strings to Date objects', async () => {
    await updateUserPlanFields({
      uid: 'uid-3',
      planExpiredAt: '2027-01-15T10:30:00Z',
      nextYearlyCreditGrantAt: '2027-05-15T10:30:00Z',
    });
    const set = updateCalls[0].set as Record<string, unknown>;
    expect(set.planExpiredAt).toBeInstanceOf(Date);
    expect((set.planExpiredAt as Date).toISOString()).toBe(
      '2027-01-15T10:30:00.000Z',
    );
    expect(set.nextYearlyCreditGrantAt).toBeInstanceOf(Date);
  });

  it('passes Date objects through unchanged', async () => {
    const d = new Date('2026-04-24T12:00:00Z');
    await updateUserPlanFields({ uid: 'uid-4', planExpiredAt: d });
    expect((updateCalls[0].set as Record<string, unknown>).planExpiredAt).toBe(
      d,
    );
  });

  it('coerces invalid date string to null (defensive)', async () => {
    await updateUserPlanFields({
      uid: 'uid-5',
      planExpiredAt: 'not-a-date',
    });
    expect(
      (updateCalls[0].set as Record<string, unknown>).planExpiredAt,
    ).toBeNull();
  });

  it('writes boolean cancelAtPeriodEnd unchanged', async () => {
    await updateUserPlanFields({
      uid: 'uid-6',
      cancelAtPeriodEnd: true,
    });
    expect(updateCalls[0].set).toEqual({ cancelAtPeriodEnd: true });
  });

  it('omits keys NOT present in input (column preserved)', async () => {
    await updateUserPlanFields({ uid: 'uid-7', plan: 'free' });
    const set = updateCalls[0].set as Record<string, unknown>;
    const keys = Object.keys(set);
    expect(keys).toEqual(['plan']);
    expect(keys).not.toContain('planExpiredAt');
    expect(keys).not.toContain('subscriptionBillingCycle');
  });

  it('skips DB call entirely when input contains only uid', async () => {
    await updateUserPlanFields({ uid: 'uid-8' });
    expect(updateCalls).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// users — next-free-grant cursor
// ---------------------------------------------------------------------------

describe('updateUserNextFreeCreditGrantAt', () => {
  it('writes both cursor columns at once', async () => {
    const next = new Date('2026-05-24T00:00:00Z');
    await updateUserNextFreeCreditGrantAt('uid-1', next, 24);
    expect(updateCalls[0].set).toEqual({
      nextFreeCreditGrantAt: next,
      freeCreditGrantAnchorDay: 24,
    });
  });
});

// ---------------------------------------------------------------------------
// credit_grants — idempotent insert
// ---------------------------------------------------------------------------

describe('insertCreditGrantIdempotent — happy path', () => {
  it('returns inserted=true and writes full row', async () => {
    nextInsertReturning = [{ id: 'idem-1' }];
    const r = await insertCreditGrantIdempotent({
      id: 'idem-1',
      uid: 'uid-1',
      subscriptionId: 'sub_123',
      planCode: 'pro_m',
      billingCycle: 'monthly',
      amount: 1000,
      grantMonth: '2026-04',
      triggerSource: 'invoice_paid',
      triggerRef: 'in_xxx',
    });
    expect(r).toEqual({ inserted: true });
    expect(insertCalls[0].values).toEqual({
      id: 'idem-1',
      uid: 'uid-1',
      subscriptionId: 'sub_123',
      planCode: 'pro_m',
      billingCycle: 'monthly',
      amount: 1000,
      grantMonth: '2026-04',
      triggerSource: 'invoice_paid',
      triggerRef: 'in_xxx',
    });
    expect(insertCalls[0].onConflictTarget).toBe('__creditGrants_id__');
    expect(insertCalls[0].returning).toEqual({ id: '__creditGrants_id__' });
  });

  it('coerces undefined triggerRef to null', async () => {
    nextInsertReturning = [{ id: 'idem-2' }];
    await insertCreditGrantIdempotent({
      id: 'idem-2',
      uid: 'uid-1',
      subscriptionId: 'free_plan',
      planCode: 'free',
      billingCycle: 'monthly',
      amount: 15,
      grantMonth: '2026-04',
      triggerSource: 'scheduler_free_monthly',
    });
    expect(
      (insertCalls[0].values as Record<string, unknown>).triggerRef,
    ).toBeNull();
  });
});

describe('insertCreditGrantIdempotent — duplicate', () => {
  it('returns inserted=false when ON CONFLICT short-circuits (no returning)', async () => {
    nextInsertReturning = [];
    const r = await insertCreditGrantIdempotent({
      id: 'idem-dup',
      uid: 'uid-1',
      subscriptionId: 'sub_123',
      planCode: 'pro_m',
      billingCycle: 'monthly',
      amount: 1000,
      grantMonth: '2026-04',
      triggerSource: 'invoice_paid',
      triggerRef: 'in_xxx',
    });
    expect(r).toEqual({ inserted: false });
  });
});

describe('insertCreditGrantIdempotent — error propagation', () => {
  it('rethrows DB errors to caller', async () => {
    nextInsertError = new Error('db boom');
    await expect(
      insertCreditGrantIdempotent({
        id: 'idem-err',
        uid: 'uid-1',
        subscriptionId: 'sub_123',
        planCode: 'pro_m',
        billingCycle: 'monthly',
        amount: 1000,
        grantMonth: '2026-04',
        triggerSource: 'invoice_paid',
      }),
    ).rejects.toThrow('db boom');
  });
});

// ---------------------------------------------------------------------------
// credit_grants — delete (rollback path)
// ---------------------------------------------------------------------------

describe('deleteCreditGrantById', () => {
  it('targets credit_grants table (single row by id)', async () => {
    await deleteCreditGrantById('idem-1');
    expect(deleteCalls).toHaveLength(1);
    expect(deleteCalls[0].table).toEqual({ id: '__creditGrants_id__' });
  });
});
