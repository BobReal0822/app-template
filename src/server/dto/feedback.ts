/**
 * Feedback DTO — wire format between handlers and clients.
 *
 * There is no list / get API for feedback today — the table is write-only from
 * the app's perspective (admin tools query Postgres directly). The canonical
 * entity DTO supports:
 *   1. Success responses with new id + createdAt (`src/server/handlers/feedback.ts`).
 *   2. Future admin / moderation surfaces.
 *
 * Contract:
 *   - `uid` is **required** in `FeedbackInsertInput`; the handler rejects
 *     unauthenticated calls.
 *   - `email` is **optional** on insert; when signed in, default from profile unless
 *     the caller overrides.
 *   - The DB column is `NOT NULL DEFAULT ''` so the handler can write `''` when
 *     no email is provided.
 */

import type { Feedback } from '@repo/db/schema';

// ---------------------------------------------------------------------------
// Canonical entity DTO
// ---------------------------------------------------------------------------

export interface FeedbackDto {
  id: string;

  uid: string;

  email: string;
  source: string;
  category: string;
  content: string;
  meta: string;
  attrs: string[];

  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Mutation inputs
// ---------------------------------------------------------------------------

/**
 * D2 lock-in: `uid` required (handler enforces auth), `email` optional
 * (defaults to '' so we don't break the NOT NULL DB column). `source`
 * remains required so the handler can validate the allow-list (currently
 * only `'in_app_modal'` post-D2).
 */
export interface FeedbackInsertInput {
  id?: string;
  email?: string;
  source: string;
  category: string;
  content: string;
  /** Free-form JSON-serialized object string (e.g. browser/device telemetry).
   * The DB column is NOT NULL DEFAULT '' so passing `undefined` is safe. */
  meta?: string;
  /** R2 storage keys for attached screenshots. Empty array if none. */
  attrs?: string[];
}

// ---------------------------------------------------------------------------
// Drizzle row → DTO conversion
// ---------------------------------------------------------------------------

function isoOrNull(d: Date | null | undefined): string | null {
  return d ? d.toISOString() : null;
}

export function feedbackRowToDto(row: Feedback): FeedbackDto {
  return {
    id: row.id,
    uid: row.uid,
    email: row.email,
    source: row.source,
    category: row.category,
    content: row.content,
    meta: row.meta,
    attrs: row.attrs,
    createdAt: isoOrNull(row.createdAt) ?? new Date(0).toISOString(),
    updatedAt: isoOrNull(row.updatedAt) ?? new Date(0).toISOString(),
  };
}
