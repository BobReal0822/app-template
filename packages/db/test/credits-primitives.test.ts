/**
 * `packages/db/src/credits.ts` end-to-end against the dev Neon branch.
 *
 * Sister file to `credits-atomic-deduct.test.ts`:
 *   - Sister covers the *raw SQL pattern* (six cases incl. the concurrent
 *     race).
 *   - This file covers the *Drizzle wrapper* (`atomicDeductCredits`,
 *     `addCredits`, `setCredits`) and specifically the discriminated
 *     `CreditUpdateOutcome` — `no_user` vs `insufficient` vs `success`.
 *
 * Both layers run inside `withRollback` so dev-yanis is left with zero
 * residue.
 */

import { eq } from 'drizzle-orm';
import { afterAll, describe, expect, it } from 'vitest';

import { _resetClientsForTests } from '../src/client.js';
import {
  addCredits,
  atomicDeductCredits,
  setCredits,
} from '../src/credits.js';
import { users } from '../src/schema/index.js';
import { endPool, hasDbUrl, makeTestUid, withRollback } from './db-helpers.js';

afterAll(async () => {
  await endPool();
  _resetClientsForTests();
});

// The primitives accept a `DbHttp` type but in tests we pass a `TxDb` (drizzle
// bound to a PoolClient inside a rolled-back transaction). At runtime both
// expose the same `update / select / where / returning` surface; the only
// difference is the underlying driver. We cast to keep the spec readable.
const asDb = (db: unknown) =>
  db as unknown as Parameters<typeof atomicDeductCredits>[0];

describe.skipIf(!hasDbUrl())('atomicDeductCredits', () => {
  it('outcome=success → returns post-deduct balance', async () => {
    await withRollback(async ({ db }) => {
      const uid = makeTestUid('prim-deduct-ok');
      await db.insert(users).values({ uid, credits: 100 });
      const result = await atomicDeductCredits(asDb(db), uid, 30);
      expect(result).toEqual({ outcome: 'success', credits: 70 });
    });
  });

  it('outcome=insufficient → carries the *current* (un-mutated) balance', async () => {
    await withRollback(async ({ db }) => {
      const uid = makeTestUid('prim-deduct-short');
      await db.insert(users).values({ uid, credits: 5 });
      const result = await atomicDeductCredits(asDb(db), uid, 10);
      expect(result).toEqual({ outcome: 'insufficient', credits: 5 });

      // Side-channel verification: row really is unchanged.
      const [row] = await db
        .select({ credits: users.credits })
        .from(users)
        .where(eq(users.uid, uid));
      expect(row?.credits).toBe(5);
    });
  });

  it('outcome=no_user → null credits, single follow-up SELECT', async () => {
    await withRollback(async ({ db }) => {
      const uid = makeTestUid('prim-deduct-no-user');
      // Don't insert the user.
      const result = await atomicDeductCredits(asDb(db), uid, 5);
      expect(result).toEqual({ outcome: 'no_user', credits: null });
    });
  });

  it('exact-balance edge: deducting full balance succeeds (CHECK allows = 0)', async () => {
    await withRollback(async ({ db }) => {
      const uid = makeTestUid('prim-deduct-zero');
      await db.insert(users).values({ uid, credits: 7 });
      const result = await atomicDeductCredits(asDb(db), uid, 7);
      expect(result).toEqual({ outcome: 'success', credits: 0 });
    });
  });
});

describe.skipIf(!hasDbUrl())('addCredits', () => {
  it('outcome=success → returns post-add balance, no insufficient path', async () => {
    await withRollback(async ({ db }) => {
      const uid = makeTestUid('prim-add-ok');
      await db.insert(users).values({ uid, credits: 10 });
      const result = await addCredits(asDb(db), uid, 25);
      expect(result).toEqual({ outcome: 'success', credits: 35 });
    });
  });

  it('outcome=no_user → null credits when target row is missing', async () => {
    await withRollback(async ({ db }) => {
      const uid = makeTestUid('prim-add-no-user');
      const result = await addCredits(asDb(db), uid, 10);
      expect(result).toEqual({ outcome: 'no_user', credits: null });
    });
  });

  it('repeated adds accumulate (refund pattern)', async () => {
    await withRollback(async ({ db }) => {
      const uid = makeTestUid('prim-add-accum');
      await db.insert(users).values({ uid, credits: 0 });
      await addCredits(asDb(db), uid, 5);
      await addCredits(asDb(db), uid, 3);
      const final = await addCredits(asDb(db), uid, 2);
      expect(final).toEqual({ outcome: 'success', credits: 10 });
    });
  });
});

describe.skipIf(!hasDbUrl())('setCredits', () => {
  it('outcome=success → balance snaps to the exact value (SET, not ADD)', async () => {
    await withRollback(async ({ db }) => {
      const uid = makeTestUid('prim-set-ok');
      await db.insert(users).values({ uid, credits: 200 });
      const result = await setCredits(asDb(db), uid, 50);
      expect(result).toEqual({ outcome: 'success', credits: 50 });
    });
  });

  it('outcome=no_user → null credits when target row is missing', async () => {
    await withRollback(async ({ db }) => {
      const uid = makeTestUid('prim-set-no-user');
      const result = await setCredits(asDb(db), uid, 100);
      expect(result).toEqual({ outcome: 'no_user', credits: null });
    });
  });

  it('SET 0 succeeds (CHECK allows credits = 0)', async () => {
    await withRollback(async ({ db }) => {
      const uid = makeTestUid('prim-set-zero');
      await db.insert(users).values({ uid, credits: 999 });
      const result = await setCredits(asDb(db), uid, 0);
      expect(result).toEqual({ outcome: 'success', credits: 0 });
    });
  });

  it('SET negative is rejected by CHECK constraint', async () => {
    // Defense-in-depth: even if the wrapper's zod gate is bypassed, the DB
    // CHECK fires. We assert the *primitive* propagates a thrown error
    // (drizzle wraps PG errors with its own message; the original
    // `users_credits_non_negative` constraint name lives in the `cause`).
    await withRollback(async ({ db }) => {
      const uid = makeTestUid('prim-set-negative');
      await db.insert(users).values({ uid, credits: 10 });
      await expect(setCredits(asDb(db), uid, -1)).rejects.toMatchObject({
        // drizzle wrapper message — exposes failed UPDATE statement
        message: expect.stringMatching(/Failed query: update "users"/i),
        // PG-level cause carries the constraint name and check violation
        cause: expect.objectContaining({
          message: expect.stringMatching(
            /users_credits_non_negative|check constraint/i,
          ),
        }),
      });
    });
  });
});
