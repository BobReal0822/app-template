import { index, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

/**
 * `credit_grants` — append-only ledger of subscription credit issuance.
 *
 * Idempotency model: `id` IS the deterministic idempotency key. Format examples:
 *   - `invoice_paid:invoice_<invoice_id>`
 *   - `scheduler_yearly:sub_<subscription_id>:2026-04`
 *
 * Two grants for the same logical event therefore collide on the PK and the
 * second insert no-ops — no separate `UNIQUE(grant_month, subscription_id)`
 * constraint is required (this corrected an earlier spike assumption).
 *
 * No `updated_at`: rows are append-only and re-issuance is forbidden by the
 * idempotency PK above. No trigger configured.
 */
export const creditGrants = pgTable(
  'credit_grants',
  {
    id: text('id').primaryKey(),

    uid: text('uid').notNull(),
    subscriptionId: text('subscription_id').notNull(),
    planCode: text('plan_code').notNull(),
    billingCycle: text('billing_cycle').notNull(),
    amount: integer('amount').notNull(),
    grantMonth: text('grant_month').notNull(),
    triggerSource: text('trigger_source').notNull(),
    triggerRef: text('trigger_ref'),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('credit_grants_uid_idx').on(t.uid),
    index('credit_grants_subscription_id_idx').on(t.subscriptionId),
    index('credit_grants_grant_month_idx').on(t.grantMonth),
    index('credit_grants_trigger_source_idx').on(t.triggerSource),
    index('credit_grants_created_at_idx').on(t.createdAt),
  ],
);

export type CreditGrant = typeof creditGrants.$inferSelect;
export type NewCreditGrant = typeof creditGrants.$inferInsert;
