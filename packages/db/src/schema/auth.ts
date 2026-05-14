import { boolean, index, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

/**
 * better-auth core tables — managed by `better-auth/adapters/drizzle`.
 *
 * Naming and shape:
 *   - **Physical tables are namespaced**: `auth_user`, `auth_session`,
 *     `auth_account`, `auth_verification`. We deliberately diverge from
 *     better-auth's default singular names (`user`, `session`, …) for two
 *     reasons:
 *       1. Avoid confusion / collision with this app's domain `users` table
 *          (in `./users.ts`), which is keyed by the same stable `uid` and stores
 *          plan / credits / Stripe IDs.
 *       2. `user` is a reserved keyword in Postgres; quoting it everywhere
 *          in raw SQL is annoying.
 *     The model-key mapping back to better-auth's expected `user` /
 *     `session` / `account` / `verification` names is done in
 *     `src/lib/auth/server.ts` via `drizzleAdapter({ schema })`.
 *   - JS property names MUST match better-auth's internal field names
 *     (camelCase: `emailVerified`, `userId`, `accessToken`, …). The adapter
 *     reads those keys via the Drizzle schema reference, NOT via SQL column
 *     names.
 *   - SQL column names are explicit `snake_case` for readability in raw
 *     SQL / migrations.
 *
 * Cascade rules:
 *   - `auth_session.user_id` and `auth_account.user_id` cascade-delete with
 *     `auth_user`, so deleting a user wipes their auth state without
 *     orphaning rows.
 *
 * NOT managed here:
 *   - The application's domain `users` table (in `./users.ts`).
 *   - `pendingRegistrations` (in `./pending_registrations.ts`).
 *
 * Triggers:
 *   - DO NOT attach a `BEFORE UPDATE` `set updated_at = now()` trigger to
 *     these tables. better-auth manages `updatedAt` in application code via
 *     the adapter; an additional DB-level trigger would race against it.
 */

export const authUser = pgTable(
  'auth_user',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull(),
    emailVerified: boolean('email_verified').notNull().default(false),
    image: text('image'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex('auth_user_email_unique').on(t.email)],
);

export const authSession = pgTable(
  'auth_session',
  {
    id: text('id').primaryKey(),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
    token: text('token').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => authUser.id, { onDelete: 'cascade' }),
  },
  (t) => [
    uniqueIndex('auth_session_token_unique').on(t.token),
    index('auth_session_user_id_idx').on(t.userId),
    index('auth_session_expires_at_idx').on(t.expiresAt),
  ],
);

export const authAccount = pgTable(
  'auth_account',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => authUser.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at', {
      withTimezone: true,
      mode: 'date',
    }),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at', {
      withTimezone: true,
      mode: 'date',
    }),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('auth_account_provider_account_unique').on(t.providerId, t.accountId),
    index('auth_account_user_id_idx').on(t.userId),
  ],
);

export const authVerification = pgTable(
  'auth_verification',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('auth_verification_identifier_idx').on(t.identifier),
    index('auth_verification_expires_at_idx').on(t.expiresAt),
  ],
);

export type AuthUser = typeof authUser.$inferSelect;
export type NewAuthUser = typeof authUser.$inferInsert;
export type AuthSession = typeof authSession.$inferSelect;
export type NewAuthSession = typeof authSession.$inferInsert;
export type AuthAccount = typeof authAccount.$inferSelect;
export type NewAuthAccount = typeof authAccount.$inferInsert;
export type AuthVerification = typeof authVerification.$inferSelect;
export type NewAuthVerification = typeof authVerification.$inferInsert;
