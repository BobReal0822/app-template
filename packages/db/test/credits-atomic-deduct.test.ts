// Validates the database-side primitive underlying `src/server/services/credits.ts`:
//
//   UPDATE users
//      SET credits = credits - $amount
//    WHERE uid = $uid AND credits >= $amount
//   RETURNING credits;
//
// Why test the raw SQL pattern (and not the future `services/credits.ts`)?
// Because the *correctness guarantees* — atomicity, no over-spend, no negative
// balance, idempotent refund accumulation — live at the SQL layer, not the TS
// wrapper. If the SQL is right, every wrapper that emits it is safe; if the
// SQL is wrong, every wrapper inherits the bug. So we lock the contract here.
//
// All cases run inside a single transaction that gets rolled back, so dev-yanis
// is left with zero residue. The concurrency case opens a *second* dedicated
// pool client outside the rollback envelope (in its own short-lived txn that
// also rolls back) — this is the only way two parallel UPDATEs can race for
// the same row, since two queries on the same client serialize.

import { and, eq, gte, sql } from 'drizzle-orm';
import { afterAll, describe, expect, it } from 'vitest';

import { _resetClientsForTests } from '../src/client.js';
import { users } from '../src/schema/index.js';
import {
  endPool,
  hasDbUrl,
  makeTestUid,
  withRollback,
  type TxDb,
} from './db-helpers.js';
import { Pool } from '@neondatabase/serverless';

afterAll(async () => {
  await endPool();
  _resetClientsForTests();
});

// Local helper: emits the canonical atomic-deduct UPDATE and returns the
// post-deduct balance, or `null` if the WHERE rejected (insufficient funds).
async function atomicDeduct(
  db: TxDb,
  uid: string,
  amount: number,
): Promise<number | null> {
  const rows = await db
    .update(users)
    .set({ credits: sql`${users.credits} - ${amount}` })
    .where(and(eq(users.uid, uid), gte(users.credits, amount)))
    .returning({ credits: users.credits });
  return rows[0]?.credits ?? null;
}

describe.skipIf(!hasDbUrl())('credits — atomic deduct primitive', () => {
  it('sufficient balance: deducts and returns the new balance', async () => {
    await withRollback(async ({ db }) => {
      const uid = makeTestUid('deduct-ok');
      await db.insert(users).values({ uid, credits: 100 });
      const after = await atomicDeduct(db, uid, 30);
      expect(after).toBe(70);
    });
  });

  it('insufficient balance: returns null, leaves credits untouched', async () => {
    await withRollback(async ({ db }) => {
      const uid = makeTestUid('deduct-no-funds');
      await db.insert(users).values({ uid, credits: 5 });
      const after = await atomicDeduct(db, uid, 10);
      expect(after).toBeNull();

      // Read back to confirm no partial write happened.
      const [row] = await db
        .select({ credits: users.credits })
        .from(users)
        .where(eq(users.uid, uid));
      expect(row?.credits).toBe(5);
    });
  });

  it('exact-balance edge: deducting all credits → 0 succeeds (CHECK allows = 0)', async () => {
    await withRollback(async ({ db }) => {
      const uid = makeTestUid('deduct-to-zero');
      await db.insert(users).values({ uid, credits: 7 });
      const after = await atomicDeduct(db, uid, 7);
      expect(after).toBe(0);
    });
  });

  it('refund pattern: credits = credits + amount accumulates correctly', async () => {
    // The refund path is additive and does not need a
    // WHERE guard; it always succeeds. Asserted here so any future "smart"
    // refactor that adds an unintended guard breaks loudly.
    await withRollback(async ({ db }) => {
      const uid = makeTestUid('refund');
      await db.insert(users).values({ uid, credits: 10 });

      await db
        .update(users)
        .set({ credits: sql`${users.credits} + ${5}` })
        .where(eq(users.uid, uid));
      await db
        .update(users)
        .set({ credits: sql`${users.credits} + ${3}` })
        .where(eq(users.uid, uid));

      const [row] = await db
        .select({ credits: users.credits })
        .from(users)
        .where(eq(users.uid, uid));
      expect(row?.credits).toBe(18);
    });
  });

  it('CHECK constraint backstop: hand-crafted UPDATE that would go negative is rejected', async () => {
    // Defense-in-depth check. Even if a buggy callsite somehow forgets the
    // `credits >= $amount` guard, the row-level CHECK constraint must reject
    // the write so we never persist a negative balance.
    await withRollback(async ({ db }) => {
      const uid = makeTestUid('check-backstop');
      await db.insert(users).values({ uid, credits: 5 });

      await expect(
        db
          .update(users)
          .set({ credits: sql`${users.credits} - ${10}` })
          .where(eq(users.uid, uid)),
      ).rejects.toThrowError(/users_credits_non_negative|check/i);
    });
  });
});

// --------------------------------------------------------------------------
// Concurrent race — two parallel deducts that *together* would over-spend.
// Exactly one MUST succeed; the other MUST get null. This is the property
// that the entire atomic-deduct design hinges on.
//
// We can't run the race inside one `withRollback` (two queries on the same
// client serialize). So we open a dedicated pool with `max: 4`, seed a user
// in one short-lived txn (commit), then race two deducts on two clients,
// then clean up the seed row in a `DELETE`. We still skip if no DB URL.
// --------------------------------------------------------------------------

describe.skipIf(!hasDbUrl())('credits — concurrent atomic deduct race', () => {
  it('two parallel deducts (each = full balance / 2 + 1) → exactly one succeeds', async () => {
    const url = process.env.POSTGRES_URL_NON_POOLING;
    if (!url) throw new Error('no POSTGRES_URL_NON_POOLING'); // .skipIf already covered, belt-and-suspenders

    const racePool = new Pool({ connectionString: url, max: 4 });
    const uid = makeTestUid('race');
    const initialBalance = 10;
    const eachAttempt = 6; // 2 * 6 = 12 > 10 — one must lose

    try {
      // Seed: real INSERT, real COMMIT (cleaned up in `finally`).
      const seedClient = await racePool.connect();
      try {
        await seedClient.query(
          'INSERT INTO users (uid, credits) VALUES ($1, $2)',
          [uid, initialBalance],
        );
      } finally {
        seedClient.release();
      }

      const runDeduct = async (): Promise<number | null> => {
        const c = await racePool.connect();
        try {
          const res = await c.query<{ credits: number }>(
            `UPDATE users
                SET credits = credits - $2
              WHERE uid = $1 AND credits >= $2
            RETURNING credits`,
            [uid, eachAttempt],
          );
          return res.rows[0]?.credits ?? null;
        } finally {
          c.release();
        }
      };

      // Kick both off in the same tick — UPDATE row-locks serialize them.
      const [a, b] = await Promise.all([runDeduct(), runDeduct()]);

      // Exactly one wins. The winner's returned balance must be the post-deduct
      // value (4 = 10 - 6). The loser must see null.
      const winners = [a, b].filter((v) => v !== null) as number[];
      const losers = [a, b].filter((v) => v === null);
      expect(winners).toHaveLength(1);
      expect(losers).toHaveLength(1);
      expect(winners[0]).toBe(initialBalance - eachAttempt);

      // And the persisted row reflects exactly one deduct.
      const verifyClient = await racePool.connect();
      try {
        const res = await verifyClient.query<{ credits: number }>(
          'SELECT credits FROM users WHERE uid = $1',
          [uid],
        );
        expect(res.rows[0]?.credits).toBe(initialBalance - eachAttempt);
      } finally {
        verifyClient.release();
      }
    } finally {
      // Always clean up the seed row, even if the race assertion fails.
      const cleanup = await racePool.connect();
      try {
        await cleanup.query('DELETE FROM users WHERE uid = $1', [uid]);
      } finally {
        cleanup.release();
      }
      await racePool.end();
    }
  });
});
