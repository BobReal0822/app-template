/**
 * Vercel Queues unified entry point.
 *
 * **All Vercel-side queue producers must go through this file.** Why a single
 * entry:
 *
 *   1. Topic name typos become a compile error via the `QueuePayloads` map.
 *   2. Per-topic payload shapes are enforced — `enqueue('persist-media-to-r2', { … })`
 *      will reject `{ … }` if it doesn't match `PersistMediaToR2TaskData`.
 *   3. If the queue backend changes, only this file should need edits.
 *
 * Consumer routes live under `src/app/api/queues/<topic>/route.ts` and are
 * wired up via `vercel.json` `experimentalTriggers` (declarative — no public
 * URL is exposed).
 *
 * Thumbnail jobs are submitted directly through
 * `@/server/media/thumbnail-from-fal` (`submitFalThumbnailJob`), so this file
 * now contains only real Vercel Queue producers.
 */

import { send } from '@vercel/queue';

import type { EmailLocale } from '@/server/email';

import * as logger from '../lib/logger';

/**
 * Data for persisting generated media to R2 storage.
 *
 * Canonical Vercel-side payload for the persist-media-to-r2 topic.
 */
export interface PersistMediaToR2TaskData {
  /** Media type for project sync branching */
  mediaType: 'image' | 'video';
  /** GenTaskItem ID */
  itemId: string;
  /** Provider temporary media URL to download */
  mediaUrl: string;
  /** R2 key prefix (e.g. 'gen-image', 'gen-video') */
  keyPrefix: string;
  /** Pre-assigned R2 key from item creation (if any) */
  preAssignedKey?: string;
  /** User UID for downstream notifications / fan-out */
  uid?: string;
  /** Parent GenTask ID (for project sync) */
  taskId: string;
  /** Task config JSON (for project sync) */
  taskConfig?: string | null;
  /** Matches FAL webhook SSE shape so clients can apply uploadKey (feature-filtered pages). */
  feature?: string | null;
  itemIndex?: number;
}

/**
 * Generic task-fail / task-stalled email notification used by long-task
 * watchdog logic (e.g. "your gen-video has been processing for 10+ minutes").
 * Kept intentionally generic — task-type-specific templating happens in the
 * producer, not the consumer.
 */
export interface EmailNotificationPayload {
  to: string;
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}

export interface UserCreatedWorkPayload {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
  photoURL: string | null;
  locale?: EmailLocale;
}

/**
 * Topic name → payload type. Add new entries here when introducing a new
 * consumer route. Topic names must match `[A-Za-z0-9_-]+` per Vercel Queues.
 */
export interface QueuePayloads {
  'persist-media-to-r2': PersistMediaToR2TaskData;
  'email-notification': EmailNotificationPayload;
  'user-created-work': UserCreatedWorkPayload;
}

export type QueueTopic = keyof QueuePayloads;

export interface EnqueueOptions {
  /**
   * Delay delivery by N seconds (max 7 days). Useful for the "X minutes
   * elapsed without completion" watchdog pattern.
   */
  delaySeconds?: number;
  /**
   * Vercel Queues' built-in dedup — window is `min(retentionSeconds, 24h)`.
   * For multi-day dedup, the consumer should additionally wrap its handler
   * in `withIdempotency()` from `@/server/lib/idempotency`.
   */
  idempotencyKey?: string;
  /**
   * Message retention in seconds (default 24h, max 7 days). Increase only
   * when the consumer might genuinely be unavailable for >24h — otherwise
   * leave the default and let messages fail-fast.
   */
  retentionSeconds?: number;
}

/**
 * Type-safe enqueue. The payload type is inferred from the topic name.
 *
 * @example
 *   await enqueue('persist-media-to-r2', {
 *     mediaType: 'image',
 *     itemId,
 *     mediaUrl,
 *     keyPrefix: 'gen-image',
 *     taskId,
 *   });
 */
export async function enqueue<T extends QueueTopic>(
  topic: T,
  payload: QueuePayloads[T],
  options: EnqueueOptions = {},
): Promise<{ messageId: string | null }> {
  try {
    const result = await send(topic, payload, {
      delaySeconds: options.delaySeconds,
      idempotencyKey: options.idempotencyKey,
      retentionSeconds: options.retentionSeconds,
    });

    logger.info(`[Queue:${topic}] enqueued`, {
      messageId: result.messageId,
      idempotencyKey: options.idempotencyKey,
      delaySeconds: options.delaySeconds,
    });

    return result;
  } catch (error) {
    // Producers are expected to be best-effort: a failed enqueue should not
    // crash the request that triggered it (e.g. a webhook). Caller decides
    // whether to surface the failure (most should not — the source of truth
    // lives in Redis / Postgres and an alert will fire from VQS metrics).
    logger.error(`[Queue:${topic}] enqueue failed`, {
      error: error instanceof Error ? error.message : String(error),
      idempotencyKey: options.idempotencyKey,
    });
    throw error;
  }
}
