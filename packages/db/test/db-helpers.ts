// Shared helpers for vitest specs that need a real Neon dev branch.
//
// Strategy mirrors `packages/db/src/verify.ts` smoke B/C: every test that
// writes data wraps its work in `withRollback(async (sql) => { ... })`, which
// runs the body inside a single dedicated client connection in `BEGIN`, then
// always `ROLLBACK`s. Nothing is ever committed, so test runs leave zero
// residue on whichever Neon branch is connected (`dev-yanis` locally,
// `dev-ci` in CI eventually).
//
// We use the `Pool` (WebSocket) driver — not `neon-http` — because:
//   - HTTP driver auto-commits each statement; cannot hold a transaction
//     across multiple awaits.
//   - We need a single dedicated client so concurrent INSERTs in the
//     credits-deduct race test see the same in-flight transaction state.

import { Pool, type PoolClient } from '@neondatabase/serverless';
import { sql as drizzleSql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-serverless';

import * as schema from '../src/schema/index.js';

function pickDirectUrl(): string {
  const url = process.env.POSTGRES_URL_NON_POOLING;
  if (!url) {
    throw new Error(
      '[@app/db tests] missing `POSTGRES_URL_NON_POOLING` in env. ' +
        'Set it in `.env.local` (pointing to a Neon dev branch) before running tests.',
    );
  }
  return url;
}

/** True when `POSTGRES_URL_NON_POOLING` is set in the current process env.
 * Use with `describe.skipIf(!hasDbUrl())` to keep specs runnable in
 * environments without a Neon branch (e.g. a fresh CI runner before secrets
 * have been wired). */
export function hasDbUrl(): boolean {
  return Boolean(process.env.POSTGRES_URL_NON_POOLING);
}

let _pool: Pool | null = null;

function getPool(): Pool {
  if (_pool) return _pool;
  _pool = new Pool({ connectionString: pickDirectUrl(), max: 4 });
  return _pool;
}

/** Tear down the shared test pool. Call from a global `afterAll` (vitest
 * `globalTeardown` would also work but is heavier for our needs). */
export async function endPool(): Promise<void> {
  if (_pool) {
    const p = _pool;
    _pool = null;
    await p.end();
  }
}

/** Drizzle handle bound to a specific PoolClient — used inside `withRollback`
 * so authz helpers exercise the same drizzle-ORM API as production code,
 * while still being scoped to the rolled-back transaction. */
export type TxDb = ReturnType<typeof drizzle<typeof schema>>;

/** Run a body inside `BEGIN; <body>; ROLLBACK;` on a dedicated pool client.
 * Returns whatever the body returns. The transaction is rolled back even if
 * the body throws — the error then propagates. */
export async function withRollback<T>(
  body: (ctx: { client: PoolClient; db: TxDb }) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    // Bind drizzle to this exact client so all queries share the txn.
    const db = drizzle(client as unknown as Pool, { schema, casing: 'snake_case' });
    try {
      return await body({ client, db });
    } finally {
      // Always rollback — tests never commit. Swallow rollback errors so the
      // original body error (if any) reaches the caller.
      await client.query('ROLLBACK').catch(() => {});
    }
  } finally {
    client.release();
  }
}

/** Generate a stable-but-unique uid for a single test. We use a UUID-ish
 * string because the `users` table stores `uid` as `text` PK (not enforced
 * UUID), matching typical auth subject id length (~28 chars). */
export function makeTestUid(label: string): string {
  // Crypto.randomUUID is available on Node 22+ (matches our runtime baseline).
  return `test-${label}-${crypto.randomUUID().slice(0, 8)}`;
}

/** Convenience: SQL fragment the credits atomic-deduct primitive should compile
 * down to. Tests assert this matches `src/server/services/credits.ts`. */
export const ATOMIC_DEDUCT_SQL = drizzleSql;
