import { getDbHttp } from '@repo/db';
import { users } from '@repo/db/schema';
import { eq } from 'drizzle-orm';

import {
  planCodeFromDbPlanId,
  subscriptionBillingCycleFromDb,
  type BillingCycle,
  type PlanCode,
} from '@/lib/billing/types';

type PlanType = PlanCode;

export interface UserData {
  uid: string;
  name: string;
  fullName: string;
  email: string;
  avatar: string;
  credits: number;
  plan: string;
  planName: PlanType;
  planCredits: number;
  planExpiredAt: string | null;
  cancelAtPeriodEnd: boolean;
  subscriptionBillingCycle: BillingCycle | null;
}

export interface AuthUserInfo {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
  photoURL: string | null;
}

/**
 * Get user data from the `users` table.
 *
 * Email always comes from the auth provider (the DB intentionally does not
 * store email — see `users.ts` schema doc).
 */
export async function getUserDataFromDB(
  authUser: AuthUserInfo,
): Promise<UserData | null> {
  try {
    const db = getDbHttp();
    const [row] = await db
      .select({
        uid: users.uid,
        name: users.name,
        avatar: users.avatar,
        credits: users.credits,
        plan: users.plan,
        planCredits: users.planCredits,
        planExpiredAt: users.planExpiredAt,
        cancelAtPeriodEnd: users.cancelAtPeriodEnd,
        subscriptionBillingCycle: users.subscriptionBillingCycle,
      })
      .from(users)
      .where(eq(users.uid, authUser.uid))
      .limit(1);

    if (!row) {
      console.warn('User not found in DB, uid:', authUser.uid);
      return null;
    }

    let fullName = row.name || '';
    if (!fullName && authUser.displayName) {
      fullName = authUser.displayName;
    }
    if (!fullName && authUser.email) {
      const emailPrefix = authUser.email.split('@')[0];
      if (emailPrefix) fullName = emailPrefix;
    }
    if (!fullName) fullName = 'User';

    const plan = planCodeFromDbPlanId(row.plan);

    return {
      uid: row.uid,
      name: row.name || '',
      fullName,
      email: authUser.email || '',
      avatar: row.avatar || authUser.photoURL || '',
      credits: row.credits || 0,
      plan,
      planName: plan,
      planCredits: row.planCredits || 0,
      planExpiredAt: row.planExpiredAt ? row.planExpiredAt.toISOString() : null,
      cancelAtPeriodEnd: row.cancelAtPeriodEnd ?? false,
      subscriptionBillingCycle: subscriptionBillingCycleFromDb(
        row.subscriptionBillingCycle,
      ),
    };
  } catch (error) {
    console.error('Error fetching user data from DB:', error);
    return null;
  }
}

/**
 * Create or update user profile fields (`name`, `avatar`).
 */
export async function upsertUserData(authUser: AuthUserInfo): Promise<boolean> {
  try {
    const db = getDbHttp();

    const insertValues: typeof users.$inferInsert = { uid: authUser.uid };
    const updateSet: Partial<typeof users.$inferInsert> = {};

    if (authUser.displayName) {
      insertValues.name = authUser.displayName;
      updateSet.name = authUser.displayName;
    }
    if (authUser.photoURL) {
      insertValues.avatar = authUser.photoURL;
      updateSet.avatar = authUser.photoURL;
    }

    if (Object.keys(updateSet).length === 0) {
      await db.insert(users).values(insertValues).onConflictDoNothing();
    } else {
      await db.insert(users).values(insertValues).onConflictDoUpdate({
        target: users.uid,
        set: updateSet,
      });
    }

    console.warn('User data upserted successfully for uid:', authUser.uid);
    return true;
  } catch (error) {
    console.error('Error upserting user data to DB:', error);
    return false;
  }
}

/**
 * Get or create user data — convenience function for the login / dashboard
 * landing flow.
 */
export async function getOrCreateUserData(
  authUser: AuthUserInfo,
): Promise<UserData | null> {
  let userData = await getUserDataFromDB(authUser);

  if (!userData) {
    console.warn('Creating new user data for uid:', authUser.uid);
    const success = await upsertUserData(authUser);
    if (success) {
      userData = await getUserDataFromDB(authUser);
    }
  }

  return userData;
}
