// Regression tests for `packages/db/src/client.ts`.
//
// These specs cover behavior that has no real-DB dependency:
//   - `POSTGRES_URL` / `POSTGRES_URL_NON_POOLING` are the only env names read.
//     No Marketplace `DB_*` fallback, no generic `DATABASE_URL[_UNPOOLED]`
//     fallback, no pooled→direct cross-fallback. See `client.ts` header for
//     the full rationale.
//   - Singleton caching for `getDbHttp` / `getDbTransaction`.
//   - Clear, actionable error messages when a required URL is missing.
//
// We mutate `process.env` per case and call `_resetClientsForTests()` to drop
// memoized clients so each spec sees a clean slate. After each case the
// original env snapshot is restored, so other test files (which assume the
// real `.env.local` URL is present) are unaffected.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  _resetClientsForTests,
  _resolveUrlsForTests,
  getDbHttp,
  getDbTransaction,
} from '../src/client.js';

// Keep this list aligned with the canonical env names read by `client.ts`.
const POSTGRES_KEYS = [
  'POSTGRES_URL',
  'POSTGRES_URL_NON_POOLING',
  'DATABASE_URL',
  'DATABASE_URL_UNPOOLED',
] as const;

function snapshotEnv(): Record<string, string | undefined> {
  return Object.fromEntries(POSTGRES_KEYS.map((k) => [k, process.env[k]]));
}

function clearAllPgEnv(): void {
  for (const k of POSTGRES_KEYS) delete process.env[k];
}

function restoreEnv(snap: Record<string, string | undefined>): void {
  for (const k of POSTGRES_KEYS) {
    if (snap[k] === undefined) delete process.env[k];
    else process.env[k] = snap[k];
  }
}

describe('client.ts — URL resolution (canonical only)', () => {
  let snap: Record<string, string | undefined>;

  beforeEach(() => {
    snap = snapshotEnv();
    clearAllPgEnv();
    _resetClientsForTests();
  });

  afterEach(() => {
    restoreEnv(snap);
    _resetClientsForTests();
  });

  it('reads POSTGRES_URL for the pooled URL', () => {
    process.env.POSTGRES_URL = 'postgres://canonical-pooled/x';
    process.env.POSTGRES_URL_NON_POOLING = 'postgres://canonical-direct/x';
    expect(_resolveUrlsForTests().pooled).toBe('postgres://canonical-pooled/x');
  });

  it('reads POSTGRES_URL_NON_POOLING for the direct URL', () => {
    process.env.POSTGRES_URL = 'postgres://canonical-pooled/x';
    process.env.POSTGRES_URL_NON_POOLING = 'postgres://canonical-direct/x';
    expect(_resolveUrlsForTests().direct).toBe('postgres://canonical-direct/x');
  });

  it('does NOT fall back to DB_POSTGRES_URL (Marketplace prefix)', () => {
    // Marketplace `DB_*` vars are shared across Production/Preview/Development
    // by Vercel's Neon integration. Silently using them would let the wrong
    // env hit the wrong Neon branch. Confirm the fallback is dead.
    process.env.DB_POSTGRES_URL = 'postgres://marketplace-pooled/x';
    process.env.DB_POSTGRES_URL_NON_POOLING = 'postgres://marketplace-direct/x';
    expect(() => _resolveUrlsForTests()).toThrowError(/missing `POSTGRES_URL`/);
  });

  it('does NOT fall back to DATABASE_URL / DATABASE_URL_UNPOOLED', () => {
    // These names are not used in this project. Make sure no one resurrects
    // them as a fallback by mistake.
    process.env.DATABASE_URL = 'postgres://generic-pooled/x';
    process.env.DATABASE_URL_UNPOOLED = 'postgres://generic-direct/x';
    expect(() => _resolveUrlsForTests()).toThrowError(/missing `POSTGRES_URL`/);
  });

  it('throws with actionable message when POSTGRES_URL is missing', () => {
    process.env.POSTGRES_URL_NON_POOLING = 'postgres://only-direct/x';
    expect(() => _resolveUrlsForTests()).toThrowError(
      /missing `POSTGRES_URL`/i
    );
  });

  it('throws with actionable message when POSTGRES_URL_NON_POOLING is missing (no pooled fallback)', () => {
    // Previous code silently fell back from direct→pooled. That fallback is
    // now gone — long-tx workflows MUST run on a direct (non-pooling)
    // endpoint, fail-fast over silently using PgBouncer.
    process.env.POSTGRES_URL = 'postgres://only-pooled/x';
    expect(() => _resolveUrlsForTests()).toThrowError(
      /missing `POSTGRES_URL_NON_POOLING`/i
    );
  });
});

describe('client.ts — singleton caching', () => {
  let snap: Record<string, string | undefined>;

  beforeEach(() => {
    snap = snapshotEnv();
    clearAllPgEnv();
    // `neon()` strictly validates URL shape (user:password@host/db). The
    // hostname does not need to resolve — the HTTP driver is lazy — but the
    // string must parse, so use an `.example` host that's guaranteed not to
    // exist if anything ever does try to dial it.
    process.env.POSTGRES_URL =
      'postgresql://stub:stub@stub.example.invalid/stub';
    process.env.POSTGRES_URL_NON_POOLING =
      'postgresql://stub:stub@stub.example.invalid/stub';
    _resetClientsForTests();
  });

  afterEach(() => {
    restoreEnv(snap);
    _resetClientsForTests();
  });

  it('getDbHttp returns the same instance on subsequent calls', () => {
    const a = getDbHttp();
    const b = getDbHttp();
    expect(a).toBe(b);
  });

  it('getDbTransaction returns the same instance on subsequent calls', () => {
    const a = getDbTransaction();
    const b = getDbTransaction();
    expect(a).toBe(b);
    expect(a.db).toBe(b.db);
    expect(a.pool).toBe(b.pool);
  });

  it('getDbHttp does NOT touch the network on construction (no eager connect)', () => {
    // The neon-http driver is lazy: it just stashes the URL and only opens
    // an HTTP request when a query runs. Asserting via fetch spy that no
    // outbound request fires during construction prevents a regression where
    // someone adds a startup health-check that breaks cold-starts.
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    getDbHttp();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('_resetClientsForTests forces a fresh instance on next call', () => {
    const before = getDbHttp();
    _resetClientsForTests();
    const after = getDbHttp();
    expect(after).not.toBe(before);
  });
});
