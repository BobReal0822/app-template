import { getDbHttp } from '@repo/db';
import { pendingRegistrations } from '@repo/db/schema';
import { and, eq, lt } from 'drizzle-orm';

import { generateOtp, hashOtp } from '@/server/auth/otp';
import { AUTH_RUNTIME } from '@/server/config/runtime';
import { type EmailLocale, sendVerificationOtpEmail } from '@/server/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(req: Request): Promise<Response> {
  const body = (await req.json().catch(() => null)) as {
    email?: string;
    locale?: string;
  } | null;
  const email = body?.email?.trim().toLowerCase();
  const locale: EmailLocale = body?.locale === 'zh' ? 'zh' : 'en';
  if (!email || !isEmail(email)) {
    return Response.json(
      { code: 400, message: 'Invalid email', data: null },
      { status: 400 },
    );
  }

  const db = getDbHttp();
  const now = new Date();
  const otp = generateOtp();
  const otpHash = hashOtp(otp, email);

  let writeResult: { email: string }[];
  try {
    writeResult = await db
      .insert(pendingRegistrations)
      .values({
        email,
        otpHash,
        attemptCount: 0,
        lastSentAt: now,
        expiresAt: new Date(
          now.getTime() + AUTH_RUNTIME.OTP_EXPIRES_SECONDS * 1000,
        ),
      })
      .onConflictDoUpdate({
        target: pendingRegistrations.email,
        set: {
          otpHash,
          attemptCount: 0,
          lastSentAt: now,
          expiresAt: new Date(
            now.getTime() + AUTH_RUNTIME.OTP_EXPIRES_SECONDS * 1000,
          ),
        },
        setWhere: lt(
          pendingRegistrations.lastSentAt,
          new Date(now.getTime() - AUTH_RUNTIME.OTP_RESEND_COOLDOWN_MS),
        ),
      })
      .returning({ email: pendingRegistrations.email });
  } catch (error) {
    const dbCode =
      typeof error === 'object' &&
      error !== null &&
      'cause' in error &&
      typeof error.cause === 'object' &&
      error.cause !== null &&
      'code' in error.cause
        ? String(error.cause.code)
        : 'unknown';
    console.error('[register/send-otp] failed to persist OTP row', { dbCode });
    return Response.json(
      { code: 500, message: 'Internal server error', data: null },
      { status: 500 },
    );
  }

  // If no row was inserted/updated, the cooldown is still active.
  // Intentionally return a generic success envelope here to avoid leaking
  // resend/cooldown state to callers.
  if (writeResult.length === 0) {
    return Response.json({ code: 0, message: 'ok', data: { ok: true } });
  }

  try {
    await sendVerificationOtpEmail(email, otp, locale);
  } catch (error) {
    // Best effort cleanup: this OTP was persisted but not delivered. Remove
    // the just-written row so the user can retry immediately instead of being
    // stuck behind cooldown on an OTP they never received.
    try {
      await db
        .delete(pendingRegistrations)
        .where(
          and(
            eq(pendingRegistrations.email, email),
            eq(pendingRegistrations.otpHash, otpHash),
          ),
        );
    } catch (cleanupError) {
      console.error(
        '[register/send-otp] failed to clean undelivered OTP row',
        cleanupError,
      );
    }
    console.error(
      '[register/send-otp] failed to send verification OTP email',
      error,
    );
    return Response.json(
      { code: 500, message: 'Internal server error', data: null },
      { status: 500 },
    );
  }

  return Response.json({ code: 0, message: 'ok', data: { ok: true } });
}
