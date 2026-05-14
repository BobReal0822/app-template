import { and, eq, lt, sql } from 'drizzle-orm';

import { verifyOtpHash } from '@/server/auth/otp';
import { issueRegistrationToken } from '@/server/auth/registration-token';
import { AUTH_RUNTIME } from '@/server/config/runtime';
import { getDbHttp } from '@app/db';
import { authAuditLogs, authUser, pendingRegistrations } from '@app/db/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request): Promise<Response> {
  const body = (await req.json().catch(() => null)) as {
    email?: string;
    otp?: string;
  } | null;
  const email = body?.email?.trim().toLowerCase();
  const otp = body?.otp?.trim();
  const isOtpShapeValid =
    typeof otp === 'string' &&
    otp.length === AUTH_RUNTIME.OTP_LENGTH &&
    /^\d+$/.test(otp);
  if (!email || !isOtpShapeValid) {
    return Response.json(
      { code: 400, message: 'Invalid payload', data: null },
      { status: 400 },
    );
  }

  const db = getDbHttp();
  const row = await db
    .select()
    .from(pendingRegistrations)
    .where(eq(pendingRegistrations.email, email))
    .limit(1);
  const pending = row[0];
  if (!pending || pending.expiresAt.getTime() < Date.now()) {
    return Response.json(
      { code: 400, message: 'expired', data: { ok: false, code: 'expired' } },
      { status: 400 },
    );
  }

  if (pending.attemptCount >= AUTH_RUNTIME.OTP_MAX_ATTEMPTS) {
    return Response.json(
      { code: 429, message: 'locked', data: { ok: false, code: 'locked' } },
      { status: 429 },
    );
  }

  if (!verifyOtpHash(pending.otpHash, otp, email)) {
    const updated = await db
      .update(pendingRegistrations)
      .set({
        attemptCount: sql`least(${pendingRegistrations.attemptCount} + 1, ${AUTH_RUNTIME.OTP_MAX_ATTEMPTS})`,
      })
      .where(
        and(
          eq(pendingRegistrations.email, email),
          lt(pendingRegistrations.attemptCount, AUTH_RUNTIME.OTP_MAX_ATTEMPTS),
        ),
      )
      .returning({ attemptCount: pendingRegistrations.attemptCount });
    const nextAttemptCount =
      updated[0]?.attemptCount ?? AUTH_RUNTIME.OTP_MAX_ATTEMPTS;
    if (
      pending.attemptCount < AUTH_RUNTIME.OTP_MAX_ATTEMPTS &&
      nextAttemptCount >= AUTH_RUNTIME.OTP_MAX_ATTEMPTS
    ) {
      await db.insert(authAuditLogs).values({
        uid: null,
        event: 'otp_locked',
        metadata: { email },
      });
    }
    return Response.json(
      {
        code: 400,
        message: 'invalid',
        data: {
          ok: false,
          code: 'invalid',
          remaining: Math.max(
            0,
            AUTH_RUNTIME.OTP_MAX_ATTEMPTS - nextAttemptCount,
          ),
        },
      },
      { status: 400 },
    );
  }

  // Atomic one-time consume: only one concurrent verifier can proceed to
  // issue a registration token.
  const consumed = await db
    .delete(pendingRegistrations)
    .where(
      and(
        eq(pendingRegistrations.email, email),
        eq(pendingRegistrations.otpHash, pending.otpHash),
        lt(pendingRegistrations.attemptCount, AUTH_RUNTIME.OTP_MAX_ATTEMPTS),
        sql`${pendingRegistrations.expiresAt} > now()`,
      ),
    )
    .returning({ email: pendingRegistrations.email });
  if (consumed.length === 0) {
    return Response.json(
      { code: 400, message: 'expired', data: { ok: false, code: 'expired' } },
      { status: 400 },
    );
  }

  const existingUser = await db
    .select({ id: authUser.id })
    .from(authUser)
    .where(eq(authUser.email, email))
    .limit(1);

  if (existingUser[0]) {
    await db.insert(authAuditLogs).values({
      uid: existingUser[0].id,
      event: 'signup_existing_account_blocked',
      metadata: { email },
    });
    return Response.json(
      {
        code: 409,
        message: 'existing_account',
        data: { ok: false, code: 'existing_account' },
      },
      { status: 409 },
    );
  }

  let registrationToken: string;
  try {
    registrationToken = await issueRegistrationToken(email);
  } catch (error) {
    console.error(
      '[register/verify-otp] failed to issue registration token',
      error,
    );
    return Response.json(
      { code: 500, message: 'Internal server error', data: null },
      { status: 500 },
    );
  }

  return Response.json({
    code: 0,
    message: 'ok',
    data: { ok: true, registrationToken },
  });
}
