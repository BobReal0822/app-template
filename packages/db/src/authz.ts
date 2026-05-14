import { eq } from 'drizzle-orm';

import { getDbHttp, type DbHttp } from './client';

import type { PgColumn } from 'drizzle-orm/pg-core';

export class UnauthenticatedError extends Error {
  readonly code = 'UNAUTHENTICATED' as const;
  constructor(message = 'UNAUTHENTICATED') {
    super(message);
    this.name = 'UnauthenticatedError';
  }
}

export class NotFoundOrForbiddenError extends Error {
  readonly code = 'NOT_FOUND_OR_FORBIDDEN' as const;
  constructor(message = 'NOT_FOUND_OR_FORBIDDEN') {
    super(message);
    this.name = 'NotFoundOrForbiddenError';
  }
}

type ScopeDeps = {
  db: DbHttp;
  /**
   * Equality predicate against the current user's uid. Apply to the `uid`
   * column of any table to enforce row-level ownership in the WHERE clause.
   *
   * Example:
   *   await deps.db.select().from(someTable).where(deps.uidEq(someTable.uid))
   */
  uidEq: (column: PgColumn) => ReturnType<typeof eq>;
  uid: string;
};

/**
 * Run a callback with implicit `WHERE uid = $uid` filter helpers.
 *
 * The wrapper does NOT silently inject the predicate — instead it passes a
 * typed `uidEq` builder to the callback, and the caller MUST attach it to
 * every query. This is intentional: silent injection couples authz to ORM
 * internals, and any future query helper would bypass it. Explicit `uidEq`
 * is grep-able and review-able.
 *
 * User-scoped reads/writes should attach `uidEq(...)` in the WHERE clause
 * (explicit scope beats implicit ORM magic).
 */
export async function withUserScope<T>(
  uid: string,
  fn: (deps: ScopeDeps) => Promise<T>
): Promise<T> {
  if (!uid) throw new UnauthenticatedError();
  return fn({
    db: getDbHttp(),
    uidEq: (col) => eq(col, uid),
    uid,
  });
}

/**
 * Load a single resource and require ownership in one call.
 *
 * `fetch` MUST already constrain by both id and uid.
 * The helper does not add any predicate of its own — it only converts a
 * "no row" result into `NotFoundOrForbiddenError`, which intentionally does
 * not distinguish between "not found" and "owned by another user" to prevent
 * ID enumeration attacks.
 */
export async function requireOwnership<T>(opts: {
  uid: string;
  fetch: (db: DbHttp, uid: string) => Promise<T | undefined | null>;
}): Promise<T> {
  if (!opts.uid) throw new UnauthenticatedError();
  const row = await opts.fetch(getDbHttp(), opts.uid);
  if (row === undefined || row === null) {
    throw new NotFoundOrForbiddenError();
  }
  return row;
}
