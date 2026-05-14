import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  jsonb,
} from 'drizzle-orm/pg-core';

export const pendingRegistrations = pgTable(
  'pending_registrations',
  {
    email: text('email').primaryKey(),
    otpHash: text('otp_hash').notNull(),
    attemptCount: integer('attempt_count').notNull().default(0),
    lastSentAt: timestamp('last_sent_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp('expires_at', {
      withTimezone: true,
      mode: 'date',
    }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('idx_pending_registrations_expires_at').on(t.expiresAt)]
);

export const authAuditLogs = pgTable(
  'auth_audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    uid: text('uid'),
    event: text('event').notNull(),
    ip: text('ip'),
    userAgent: text('user_agent'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('idx_auth_audit_logs_uid').on(t.uid, t.createdAt)]
);
