import { index, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

/**
 * `login_logs` — security audit trail of successful logins.
 *
 * Append-only; no `updated_at`, no soft-delete. Auto-incrementing `id` (serial)
 * (`serial` in Postgres).
 */
export const loginLogs = pgTable(
  'login_logs',
  {
    id: serial('id').primaryKey(),
    uid: text('uid').notNull(),
    ip: text('ip').notNull(),
    userAgent: text('user_agent').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('login_logs_uid_idx').on(t.uid),
    index('login_logs_created_at_idx').on(t.createdAt),
    index('login_logs_uid_created_at_idx').on(t.uid, t.createdAt),
  ],
);

export type LoginLog = typeof loginLogs.$inferSelect;
export type NewLoginLog = typeof loginLogs.$inferInsert;
