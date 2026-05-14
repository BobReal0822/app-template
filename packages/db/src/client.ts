import { neon, Pool } from '@neondatabase/serverless';
import { drizzle as drizzleHttp } from 'drizzle-orm/neon-http';
import { drizzle as drizzlePool } from 'drizzle-orm/neon-serverless';

import * as schema from './schema';

// We do NOT polyfill `neonConfig.webSocketConstructor`. The driver only needs a
// WebSocket constructor when `Pool` / `drizzle-orm/neon-serverless` is used,
// and every supported runtime already ships one:
//   - Browsers: native `globalThis.WebSocket`.
//   - Node.js 22+ (Vercel default is Node 24 LTS, our local toolchain is Node
//     22+): `globalThis.WebSocket` is stable.
//   - Edge / Workers: native `WebSocket`.
// Older Node runtimes (≤20) would need an explicit `import ws from 'ws';
// neonConfig.webSocketConstructor = ws;` — this package intentionally does not
// support them.

// Naming convention — single canonical pair:
//   - `POSTGRES_URL`             — pooled connection string (PgBouncer endpoint).
//   - `POSTGRES_URL_NON_POOLING` — direct connection string (used for long
//     transactions, migrations, and the WebSocket pool driver).
//
// We deliberately do NOT fall back to Vercel Marketplace's `DB_*` prefix or to
// the generic `DATABASE_URL[_UNPOOLED]` names. Reasons:
//   - The Marketplace `DB_*` vars get auto-injected on integration creation
//     and end up *shared across Production / Preview / Development*. Silently
//     falling back to them masks misconfiguration and would let preview /
//     local writes hit the production Neon branch.
//   - `DATABASE_URL[_UNPOOLED]` is not configured in any environment we run.
//
// Both URLs MUST be set explicitly per environment (Vercel project Env vars,
// or `.env.local` for personal dev branches). Missing either throws on the
// first call to `getDbHttp()` / `getDbTransaction()` — fail-fast over silent
// fallback.
//
// ---------------------------------------------------------------------------
// Public API: `getDbHttp()` vs `getDbTransaction()` — when to use which
// ---------------------------------------------------------------------------
//   - `getDbHttp()`         → ~99% of read/write paths.
//                             One-shot, stateless queries via the HTTP driver.
//                             Uses `POSTGRES_URL` (pooled, via PgBouncer).
//   - `getDbTransaction()`  → Long-running multi-statement transactions,
//                             session-level state (advisory locks, `LISTEN`,
//                             `SET`, prepared statements), and migration
//                             scripts. WebSocket pool driver via
//                             `@neondatabase/serverless` `Pool`.
//                             Uses `POSTGRES_URL_NON_POOLING` (direct).
//
// Naming axis is *use case* (HTTP one-shot vs. Transaction-capable), NOT
// "pooled vs unpooled connection string". The connection-pooling decision is
// an internal consequence: PgBouncer's transaction-pooling mode breaks the
// session state that the WebSocket pool driver needs, so a client-side pool
// MUST connect to the direct (non-pooling) Neon endpoint. See `getDbTransaction`'s
// own header comment for the full driver-level explanation.
type Env = {
  POSTGRES_URL?: string;
  POSTGRES_URL_NON_POOLING?: string;
};

function getEnv(): Env {
  return process.env as unknown as Env;
}

function readPooledUrl(): string {
  const url = getEnv().POSTGRES_URL;
  if (!url) {
    throw new Error(
      '@app/db: missing `POSTGRES_URL`. Set the pooled Neon connection string ' +
        'in `.env.local` (per-developer dev branch) or in Vercel project Env vars ' +
        '(per-environment, pointing at the right Neon branch).',
    );
  }
  return url;
}

function readDirectUrl(): string {
  const url = getEnv().POSTGRES_URL_NON_POOLING;
  if (!url) {
    throw new Error(
      '@app/db: missing `POSTGRES_URL_NON_POOLING`. Set the direct (non-pooling) ' +
        'Neon connection string in `.env.local` or in Vercel project Env vars. ' +
        'Required for long transactions, the WebSocket pool driver, and migrations.',
    );
  }
  return url;
}

// ---------------------------------------------------------------------------
// dbHttp — pooled HTTP driver. Use for the vast majority of read/write paths
// in serverless / Fluid Compute functions: zero connection overhead per call,
// no pool to drain, safe to call from cold-started invocations.
// ---------------------------------------------------------------------------

let cachedHttp: ReturnType<typeof drizzleHttp<typeof schema>> | null = null;

export function getDbHttp() {
  if (cachedHttp) return cachedHttp;
  const sql = neon(readPooledUrl());
  cachedHttp = drizzleHttp(sql, { schema, casing: 'snake_case' });
  return cachedHttp;
}

// ---------------------------------------------------------------------------
// dbTransaction — WebSocket-backed driver via @neondatabase/serverless `Pool`.
// Use for: long-running transactions, multi-statement atomic units that the
// HTTP driver cannot bundle, and migration scripts.
//
// Why a `Pool` (client-side connection pool) for transactions: a single
// long-lived WebSocket connection would serialize every concurrent request
// in the function instance. The `Pool` lets multiple in-flight transactions
// run on separate underlying connections while still keeping each individual
// transaction pinned to one connection (which is what makes the transaction
// atomic across awaits). This client-side pool is unrelated to PgBouncer —
// in fact it MUST connect to `POSTGRES_URL_NON_POOLING` because PgBouncer's
// transaction-pooling mode would break session state.
//
// Caller is responsible for `pool.end()` only inside short-lived scripts
// (Fluid Compute keeps the global pool alive across invocations).
// ---------------------------------------------------------------------------

let cachedTx: { db: ReturnType<typeof drizzlePool<typeof schema>>; pool: Pool } | null = null;

export function getDbTransaction() {
  if (cachedTx) return cachedTx;
  const pool = new Pool({ connectionString: readDirectUrl() });
  const db = drizzlePool(pool, { schema, casing: 'snake_case' });
  cachedTx = { db, pool };
  return cachedTx;
}

export type DbHttp = ReturnType<typeof getDbHttp>;
export type DbTransaction = ReturnType<typeof getDbTransaction>['db'];

// ---------------------------------------------------------------------------
// Test-only internals.
//
// These are exported from `client.ts` but intentionally NOT re-exported from
// `index.ts`, so the public `@app/db` surface stays clean. Application code
// must NOT import these — vitest specs in `packages/db/test/` import them via
// the relative path `../src/client.js`.
// ---------------------------------------------------------------------------

/** @internal — vitest only. Resolves the same URLs `getDbHttp` and
 * `getDbTransaction` would use for the current `process.env`, without
 * actually opening a connection. Lets us assert env resolution and error
 * messages. */
export function _resolveUrlsForTests(): { pooled: string; direct: string } {
  return { pooled: readPooledUrl(), direct: readDirectUrl() };
}

/** @internal — vitest only. Drops the cached HTTP / transaction-pool clients
 * so the next `getDbHttp` / `getDbTransaction` call rebuilds them from the
 * (possibly mutated) environment. Required because both helpers memoize a
 * singleton on first call and there is no other way to swap connection
 * strings within one Node process. */
export function _resetClientsForTests(): void {
  cachedHttp = null;
  if (cachedTx) {
    void cachedTx.pool.end().catch(() => {});
    cachedTx = null;
  }
}
