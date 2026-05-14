/**
 * CreditGrant DTO — wire format between handlers and clients.
 *
 * Wire shape for `credit_grants`. The table is
 * **append-only** — there is no update DTO and there is no `updatedAt`
 * field on the wire (the column doesn't exist in the schema either).
 *
 * Idempotency model:
 *   - `id` IS the deterministic idempotency key (e.g.
 *     `invoice_paid:invoice_<invoice_id>`).
 *   - Two grants for the same logical event collide on the PK; the second
 *     insert no-ops at the DB layer.
 *
 * Notes specific to this domain:
 *   - **`id` is `text`, NOT a UUID.** It encodes the source-of-record
 *     (e.g. Stripe invoice id) plus a discriminator. Validation is the
 *     handler's job; the DTO accepts any string.
 *   - **No `updatedAt`.** Don't add it on the wire just because every
 *     other DTO has one — it would lie about table semantics.
 *   - **No mutation update input.** Only insert.
 *   - `triggerRef` is the only nullable column.
 */

import type { CreditGrant } from '@app/db/schema';

// ---------------------------------------------------------------------------
// Canonical entity DTO
// ---------------------------------------------------------------------------

export interface CreditGrantDto {
  /** Deterministic idempotency key, NOT a UUID. */
  id: string;

  uid: string;

  /** Stripe subscription id (or equivalent for non-Stripe grants). */
  subscriptionId: string;
  /** Plan code at the time of grant (denormalized snapshot). */
  planCode: string;
  /** `'monthly' | 'yearly'` (string-typed for forward-compat). */
  billingCycle: string;

  /** Number of credits granted by this row. Always positive. */
  amount: number;

  /**
   * `YYYY-MM` of the credit period the grant applies to. Used to surface
   * "credits issued this month" totals and to detect missing months.
   */
  grantMonth: string;

  /** e.g. `'invoice_paid'`, `'scheduler_yearly'`. */
  triggerSource: string;
  /** Free-form ref to the originating event (Stripe event id, etc.). */
  triggerRef: string | null;

  createdAt: string;
}

// ---------------------------------------------------------------------------
// Mutation inputs
// ---------------------------------------------------------------------------

/**
 * Create-only input. The caller MUST supply a deterministic `id` — passing
 * undefined would defeat the entire idempotency model.
 */
export interface CreditGrantInsertInput {
  /** Required deterministic idempotency key. */
  id: string;
  uid: string;
  subscriptionId: string;
  planCode: string;
  billingCycle: string;
  amount: number;
  grantMonth: string;
  triggerSource: string;
  triggerRef?: string | null;
}

// ---------------------------------------------------------------------------
// Drizzle row → DTO conversion
// ---------------------------------------------------------------------------

function isoOrNull(d: Date | null | undefined): string | null {
  return d ? d.toISOString() : null;
}

export function creditGrantRowToDto(row: CreditGrant): CreditGrantDto {
  return {
    id: row.id,
    uid: row.uid,
    subscriptionId: row.subscriptionId,
    planCode: row.planCode,
    billingCycle: row.billingCycle,
    amount: row.amount,
    grantMonth: row.grantMonth,
    triggerSource: row.triggerSource,
    triggerRef: row.triggerRef ?? null,
    createdAt: isoOrNull(row.createdAt) ?? new Date(0).toISOString(),
  };
}
