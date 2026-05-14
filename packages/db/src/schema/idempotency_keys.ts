import { index, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const idempotencyKeys = pgTable(
  'idempotency_keys',
  {
    key: text('key').primaryKey(),
    source: text('source').notNull(),
    status: text('status').notNull(),
    expireAt: timestamp('expire_at', {
      withTimezone: true,
      mode: 'date',
    }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('idx_idempotency_keys_expire_at').on(t.expireAt)]
);

export type IdempotencyKey = typeof idempotencyKeys.$inferSelect;
export type NewIdempotencyKey = typeof idempotencyKeys.$inferInsert;
