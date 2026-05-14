import { eq } from 'drizzle-orm';

import { getDbHttp } from '@app/db';
import { idempotencyKeys } from '@app/db/schema';

import * as logger from './logger';

const TTL_SECONDS = 7 * 24 * 60 * 60;
type Status = 'pending' | 'completed';

export interface IdempotencyResult<T> {
  /** True iff `fn` ran in this invocation. False means the key was deduped. */
  executed: boolean;
  /** Result of `fn`. Only present when `executed` is true. */
  result?: T;
}

/**
 * Run `fn` exactly once per `key` within the TTL window.
 */
export async function withIdempotency<T>(
  key: string,
  source: string,
  fn: () => Promise<T>,
): Promise<IdempotencyResult<T>> {
  const tag = `[Idempotency:${source}]`;
  const db = getDbHttp();
  const expireAt = new Date(Date.now() + TTL_SECONDS * 1000);

  const claimed = await db
    .insert(idempotencyKeys)
    .values({
      key,
      source,
      status: 'pending' satisfies Status,
      expireAt,
    })
    .onConflictDoNothing()
    .returning({ key: idempotencyKeys.key });

  if (!claimed[0]) {
    logger.info(`${tag} dedup hit, skipping`, { key });
    return { executed: false };
  }

  try {
    const result = await fn();
    await db
      .update(idempotencyKeys)
      .set({ status: 'completed' })
      .where(eq(idempotencyKeys.key, key));
    return { executed: true, result };
  } catch (error) {
    await db
      .delete(idempotencyKeys)
      .where(eq(idempotencyKeys.key, key))
      .catch((delErr) => {
        logger.error(`${tag} failed to release idempotency claim`, {
          key,
          error: delErr instanceof Error ? delErr.message : String(delErr),
        });
      });
    throw error;
  }
}

/**
 * Read-only check: has `key` already been processed to completion?
 */
export async function wasProcessed(key: string): Promise<boolean> {
  const db = getDbHttp();
  const rows = await db
    .select({ status: idempotencyKeys.status })
    .from(idempotencyKeys)
    .where(eq(idempotencyKeys.key, key))
    .limit(1);
  return rows[0]?.status === 'completed';
}
