import { sql } from 'drizzle-orm';
import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

/**
 * `feedbacks` — in-app feedback records.
 *
 * `uid` is `NOT NULL`; `src/server/handlers/feedback.ts` rejects
 * unauthenticated calls. The allowed `source` for new rows is `'in_app_modal'`.
 *
 * `attrs` defaults to an empty array so handler bugs cannot crash inserts on
 * the NOT NULL constraint; the application code still always writes an
 * explicit array.
 *
 * Column names use Drizzle's default camelCase → snake_case mapping in SQL.
 */
export const feedbacks = pgTable(
  'feedbacks',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    uid: text('uid').notNull(),

    email: text('email').notNull().default(''),
    source: text('source').notNull().default('unknown'),
    category: text('category').notNull().default('other'),
    content: text('content').notNull(),
    meta: text('meta').notNull().default(''),
    attrs: text('attrs')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
  },
  (t) => [
    index('feedbacks_uid_idx').on(t.uid),
    index('feedbacks_created_at_idx').on(t.createdAt),
  ],
);

export type Feedback = typeof feedbacks.$inferSelect;
export type NewFeedback = typeof feedbacks.$inferInsert;
