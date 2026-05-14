import { sql } from 'drizzle-orm';
import { boolean, check, index, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

/**
 * `users` — domain profile keyed by the authenticated user's stable id (`uid`).
 *
 * Source of truth for: plan code, current credit balance, scheduler cursors
 * (free monthly grants and yearly grants), Stripe customer/subscription IDs.
 *
 * Notes:
 * - `uid` matches Better Auth / session subject (string id), used as the natural PK.
 * - `email` is intentionally NOT stored here — read it from `auth_user` / session.
 * - `credits >= 0` is enforced at the DB layer (CHECK constraint) so that the
 *   atomic deduct path (`UPDATE users SET credits = credits - $n WHERE credits >= $n RETURNING …`)
 *   gets a second line of defense against negative balances.
 * - `updated_at` is auto-maintained by a `BEFORE UPDATE` trigger applied via
 *   the post-baseline manual migration (see
 *   `drizzle/manual/0001_setup_updated_at_triggers.sql`).
 */
export const users = pgTable(
  'users',
  {
    uid: text('uid').primaryKey(),

    name: text('name').notNull().default(''),
    avatar: text('avatar').notNull().default(''),

    // 1=normal, 2=abnormal, 3=forbidden, 4=closed (text enum, app-defined).
    status: text('status').notNull().default('1'),

    credits: integer('credits').notNull().default(15),

    plan: text('plan').notNull().default('free'),
    planCredits: integer('plan_credits').notNull().default(0),
    planExpiredAt: timestamp('plan_expired_at', { withTimezone: true, mode: 'date' }),

    cancelAtPeriodEnd: boolean('subscription_cancel_at_period_end').notNull().default(false),
    subscriptionBillingCycle: text('subscription_billing_cycle'),
    stripeSubscriptionId: text('stripe_subscription_id'),

    nextYearlyCreditGrantAt: timestamp('next_yearly_credit_grant_at', {
      withTimezone: true,
      mode: 'date',
    }),
    yearlyCreditGrantAnchorDay: integer('yearly_credit_grant_anchor_day'),

    stripeCustomerId: text('stripe_customer_id'),

    nextFreeCreditGrantAt: timestamp('next_free_credit_grant_at', {
      withTimezone: true,
      mode: 'date',
    }),
    freeCreditGrantAnchorDay: integer('free_credit_grant_anchor_day'),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('users_status_idx').on(t.status),
    index('users_plan_idx').on(t.plan),
    index('users_plan_next_free_grant_idx').on(t.plan, t.nextFreeCreditGrantAt),
    index('users_created_at_idx').on(t.createdAt),
    check('users_credits_non_negative', sql`${t.credits} >= 0`),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
