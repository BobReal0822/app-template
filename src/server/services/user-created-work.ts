import { sendWelcomeEmail } from '@/server/email';
import { addUtcMonths } from '@/server/lib/date-utc';
import * as logger from '@/server/lib/logger';
import type { UserCreatedWorkPayload } from '@/server/queue/enqueue';
import { getDbHttp } from '@app/db';
import { users } from '@app/db/schema';

/**
 * Worker payload handler for user-created async processing.
 *
 * Responsibilities:
 * - Ensure users row exists with free-credit schedule seed fields.
 * - Send welcome email for verified users.
 */
export async function handleUserCreatedWork(
  payload: UserCreatedWorkPayload,
): Promise<void> {
  const { uid, email, emailVerified, displayName, photoURL } = payload;
  if (!uid) {
    throw new Error('Missing uid in user-created-work payload');
  }

  const signupAt = new Date();
  const insertValues: typeof users.$inferInsert = {
    uid,
    nextFreeCreditGrantAt: addUtcMonths(signupAt, 1),
    freeCreditGrantAnchorDay: signupAt.getUTCDate(),
  };
  const updateSet: Partial<typeof users.$inferInsert> = {};
  if (displayName) {
    insertValues.name = displayName;
    updateSet.name = displayName;
  }
  if (photoURL) {
    insertValues.avatar = photoURL;
    updateSet.avatar = photoURL;
  }

  const db = getDbHttp();
  if (Object.keys(updateSet).length === 0) {
    await db.insert(users).values(insertValues).onConflictDoNothing();
  } else {
    await db
      .insert(users)
      .values(insertValues)
      .onConflictDoUpdate({ target: users.uid, set: updateSet });
  }

  logger.info('[Queue:user-created-work] user row upserted', { uid });

  if (!email) {
    logger.warn(
      '[Queue:user-created-work] skipping welcome email (missing email)',
      {
        uid,
      },
    );
    return;
  }
  if (!emailVerified) {
    // TODO: Align welcome-email timing across providers (see log below).
    // Current behavior sends welcome email only when emailVerified is already
    // true at user-created time (common for Google OAuth), which means
    // email/password signups usually skip welcome email here. Add a follow-up
    // "email verified" trigger/path so both signup methods reliably receive
    // the welcome email once verification is complete.
    logger.info(
      '[Queue:user-created-work] skipping welcome email (email not verified)',
      { uid, email },
    );
    return;
  }

  const result = await sendWelcomeEmail(email, {
    userName: displayName || undefined,
    locale: payload.locale ?? 'en',
  });
  if (result.success) {
    logger.info('[Queue:user-created-work] welcome email sent', {
      uid,
      email,
      messageId: result.messageId,
    });
    return;
  }

  // Welcome email should not fail the whole workflow or trigger retries that
  // could cause duplicates. Log and ack.
  logger.error('[Queue:user-created-work] welcome email failed', {
    uid,
    email,
  });
}
