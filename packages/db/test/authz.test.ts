// Unit tests for `packages/db/src/authz.ts`.
//
// Coverage map (five application-level authz patterns):
//
//   1. AUTH_REQUIRED            — handler-layer concern (`requireUser`); not
//                                 in @repo/db. Covered by handler / auth tests.
//   2. OWNER_SCOPED             — `withUserScope(uid, db => db.where(uidEq(...)))`;
//                                 the helper itself is unit-tested below. The
//                                 application-level pattern is exercised in
//                                 the handler/service tests against your own
//                                 owner-scoped tables (e.g. add a `projects`
//                                 schema).
//   3. OWNER_SCOPED_VIA_PARENT  — the same `requireOwnership` shape with a
//                                 fetch that joins through a parent table;
//                                 covered in handler-level tests.
//   4. ADMIN_ONLY               — handler-layer concern; not in @repo/db.
//   5. PUBLIC_NO_AUTH           — no authz to test.
//
// Plus the indistinguishability invariant: "not found" and "owned by another
// user" must throw the same `NotFoundOrForbiddenError` to defeat ID
// enumeration attacks.

import { afterAll, describe, expect, it } from 'vitest';

import {
  NotFoundOrForbiddenError,
  UnauthenticatedError,
  requireOwnership,
  withUserScope,
} from '../src/authz.js';
import { _resetClientsForTests } from '../src/client.js';
import { users } from '../src/schema/index.js';

afterAll(() => {
  // Drop client.ts cached singletons too — other test files might run after
  // and expect to manage their own env.
  _resetClientsForTests();
});

// --------------------------------------------------------------------------
// withUserScope basics — pure unit tests, no DB required.
// --------------------------------------------------------------------------

describe('withUserScope — basics', () => {
  it('throws UnauthenticatedError on empty uid', async () => {
    await expect(withUserScope('', async () => 'never')).rejects.toBeInstanceOf(
      UnauthenticatedError,
    );
  });

  it('passes uid + db + uidEq builder to the callback', async () => {
    const calls: string[] = [];
    const result = await withUserScope('user-xyz', async (deps) => {
      calls.push(deps.uid);
      // uidEq returns a drizzle SQL chunk; we only check it does not throw
      // and produces a stable, repeatable value for the same column.
      const a = deps.uidEq(users.uid);
      const b = deps.uidEq(users.uid);
      expect(a).toBeDefined();
      expect(b).toBeDefined();
      expect(typeof deps.db.select).toBe('function');
      return 'ok';
    });
    expect(result).toBe('ok');
    expect(calls).toEqual(['user-xyz']);
  });
});

// --------------------------------------------------------------------------
// requireOwnership basics — pure unit tests, no DB required.
// --------------------------------------------------------------------------

describe('requireOwnership — basics', () => {
  it('throws UnauthenticatedError on empty uid', async () => {
    await expect(
      requireOwnership({ uid: '', fetch: async () => ({ id: 1 }) }),
    ).rejects.toBeInstanceOf(UnauthenticatedError);
  });

  it('throws NotFoundOrForbiddenError when fetch returns undefined', async () => {
    await expect(
      requireOwnership({ uid: 'u1', fetch: async () => undefined }),
    ).rejects.toBeInstanceOf(NotFoundOrForbiddenError);
  });

  it('throws NotFoundOrForbiddenError when fetch returns null', async () => {
    await expect(
      requireOwnership({ uid: 'u1', fetch: async () => null }),
    ).rejects.toBeInstanceOf(NotFoundOrForbiddenError);
  });

  it('returns the row when fetch resolves with a value', async () => {
    const row = await requireOwnership({
      uid: 'u1',
      fetch: async () => ({ id: 'p1', uid: 'u1' }),
    });
    expect(row).toEqual({ id: 'p1', uid: 'u1' });
  });

  it('error codes are stable strings (used by API route → HTTP mapping)', async () => {
    try {
      await requireOwnership({ uid: '', fetch: async () => null });
      expect.fail('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(UnauthenticatedError);
      expect((e as UnauthenticatedError).code).toBe('UNAUTHENTICATED');
    }
    try {
      await requireOwnership({ uid: 'u1', fetch: async () => null });
      expect.fail('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(NotFoundOrForbiddenError);
      expect((e as NotFoundOrForbiddenError).code).toBe('NOT_FOUND_OR_FORBIDDEN');
    }
  });

  it('not-found and cross-user throw the SAME error type (no enumeration leak)', async () => {
    // Both branches use the same fetcher contract: it returns `undefined`
    // either when the row does not exist OR when it exists but the caller
    // does not own it. The handler MUST NOT distinguish the two.
    const fetcherReturnsUndefined = async (
      _db: unknown,
      _uid: string,
    ): Promise<undefined> => undefined;

    const errA = await captureError(() =>
      requireOwnership({ uid: 'u1', fetch: fetcherReturnsUndefined }),
    );
    const errB = await captureError(() =>
      requireOwnership({ uid: 'u2', fetch: fetcherReturnsUndefined }),
    );

    expect(errA).toBeInstanceOf(NotFoundOrForbiddenError);
    expect(errB).toBeInstanceOf(NotFoundOrForbiddenError);
    expect((errA as NotFoundOrForbiddenError).code).toBe(
      (errB as NotFoundOrForbiddenError).code,
    );
    expect((errA as NotFoundOrForbiddenError).message).toBe(
      (errB as NotFoundOrForbiddenError).message,
    );
  });
});

// --------------------------------------------------------------------------
// helpers
// --------------------------------------------------------------------------

async function captureError(fn: () => Promise<unknown>): Promise<unknown> {
  try {
    await fn();
    throw new Error('expected to throw, did not');
  } catch (e) {
    return e;
  }
}
