import { getDbHttp } from '@repo/db';
import { authAuditLogs, authUser } from '@repo/db/schema';
import { eq } from 'drizzle-orm';

import { isStrongPassword } from '@/lib/auth/password-policy';
import { auth } from '@/lib/auth/server';
import { verifyRegistrationToken } from '@/server/auth/registration-token';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface SignUpEmailResult {
  user?: { id: string } | null;
  error?: unknown;
}

type SignUpEmailInput = {
  body: { email: string; password: string; name: string };
};

type SignUpEmailFn = (args: SignUpEmailInput) => Promise<SignUpEmailResult>;

function getSignUpEmailFn(value: unknown): SignUpEmailFn | null {
  const candidate = (value as { api?: { signUpEmail?: unknown } } | null)?.api
    ?.signUpEmail;
  return typeof candidate === 'function' ? (candidate as SignUpEmailFn) : null;
}

export async function POST(req: Request): Promise<Response> {
  const body = (await req.json().catch(() => null)) as {
    registrationToken?: string;
    password?: string;
    name?: string;
  } | null;
  const registrationToken = body?.registrationToken?.trim();
  const password = body?.password ?? '';
  const name = body?.name?.trim();
  if (!registrationToken || !isStrongPassword(password)) {
    return Response.json(
      { code: 400, message: 'Invalid payload', data: null },
      { status: 400 },
    );
  }

  let email: string;
  try {
    ({ email } = await verifyRegistrationToken(registrationToken));
  } catch {
    return Response.json(
      { code: 400, message: 'Invalid or expired token', data: null },
      { status: 400 },
    );
  }

  const fallbackName = email.split('@')[0]?.trim() || 'User';
  const finalName = name && name.length > 0 ? name : fallbackName;
  const db = getDbHttp();

  const signUpEmail = getSignUpEmailFn(auth);
  if (!signUpEmail) {
    console.error('[register/complete] signUpEmail API is unavailable');
    return Response.json(
      { code: 500, message: 'Internal server error', data: null },
      { status: 500 },
    );
  }

  let signUpResult: SignUpEmailResult;
  try {
    signUpResult = await signUpEmail({
      body: { email, password, name: finalName },
    });
  } catch (error) {
    console.error('[register/complete] signUpEmail failed', error);
    return Response.json(
      { code: 500, message: 'Internal server error', data: null },
      { status: 500 },
    );
  }
  let createdUserId = signUpResult.user?.id;
  let usedUnverifiedRecreateRecovery = false;

  // `signUpEmail` failure is most commonly unique-email conflict.
  // Probe once to distinguish:
  // 1) existing+verified => email_taken
  // 2) existing+unverified => recreate + retry with the requested password
  // 3) no row => unexpected failure
  if (signUpResult?.error) {
    const existingUsers = await db
      .select({
        id: authUser.id,
        emailVerified: authUser.emailVerified,
      })
      .from(authUser)
      .where(eq(authUser.email, email))
      .limit(1);
    const existingUser = existingUsers[0];

    if (!existingUser) {
      console.error(
        '[register/complete] signUpEmail failed without conflicting user row',
        signUpResult.error,
      );
      return Response.json(
        { code: 500, message: 'Internal server error', data: null },
        { status: 500 },
      );
    }

    if (existingUser.emailVerified) {
      return Response.json(
        {
          code: 409,
          message: 'email_taken',
          data: { ok: false, code: 'email_taken' },
        },
        { status: 409 },
      );
    }

    // We verified ownership via OTP already, but the credential payload may be
    // stale if an old unverified account row exists. Recreate once so the
    // requested password/name become the source of truth.
    try {
      await db.delete(authUser).where(eq(authUser.id, existingUser.id));
    } catch (error) {
      console.error(
        '[register/complete] failed to delete stale unverified auth user',
        error,
      );
      return Response.json(
        { code: 500, message: 'Internal server error', data: null },
        { status: 500 },
      );
    }

    let retryResult: SignUpEmailResult;
    try {
      retryResult = await signUpEmail({
        body: { email, password, name: finalName },
      });
    } catch (error) {
      console.error(
        '[register/complete] signUpEmail retry after unverified cleanup failed',
        error,
      );
      return Response.json(
        { code: 500, message: 'Internal server error', data: null },
        { status: 500 },
      );
    }

    if (retryResult?.error || !retryResult.user?.id) {
      const conflictUsers = await db
        .select({
          id: authUser.id,
          emailVerified: authUser.emailVerified,
        })
        .from(authUser)
        .where(eq(authUser.email, email))
        .limit(1);
      if (conflictUsers[0]?.emailVerified) {
        return Response.json(
          {
            code: 409,
            message: 'email_taken',
            data: { ok: false, code: 'email_taken' },
          },
          { status: 409 },
        );
      }
      console.error(
        '[register/complete] signUpEmail retry failed without usable user id',
        retryResult?.error,
      );
      return Response.json(
        { code: 500, message: 'Internal server error', data: null },
        { status: 500 },
      );
    }

    signUpResult = retryResult;
    createdUserId = retryResult.user.id;
    usedUnverifiedRecreateRecovery = true;
  }

  if (!createdUserId) {
    console.error('[register/complete] missing user id after sign-up/recovery');
    return Response.json(
      { code: 500, message: 'Internal server error', data: null },
      { status: 500 },
    );
  }

  // OTP verification already proved email ownership, but better-auth's
  // `signUpEmail` API doesn't accept `emailVerified` and defaults it to false.
  // We must flip the column to true here — otherwise the client-side
  // `authClient.signIn.email(...)` that runs right after this returns will be
  // rejected by better-auth's `requireEmailVerification: true` check.
  try {
    await db
      .update(authUser)
      .set({ emailVerified: true, updatedAt: new Date() })
      .where(eq(authUser.id, createdUserId));
  } catch (error) {
    console.error('[register/complete] failed to mark emailVerified', error);
    return Response.json(
      { code: 500, message: 'Internal server error', data: null },
      { status: 500 },
    );
  }

  const auditEvent = usedUnverifiedRecreateRecovery
    ? 'signup_complete_recreated_unverified'
    : 'signup_complete';
  try {
    await db.insert(authAuditLogs).values({
      uid: createdUserId,
      event: auditEvent,
      metadata: { email },
    });
  } catch (error) {
    // Best-effort: do not fail registration completion for audit write issues.
    console.error('[register/complete] failed to write audit log', error);
  }

  // The client signs in via `authClient.signIn.email(...)` after this returns,
  // so the better-auth React store updates through its canonical path. Doing
  // sign-in here would set the session cookie server-side but bypass the
  // client store, requiring a manual refresh dance to keep `useSession()` in
  // sync. See sign-up/use-sign-up-flow.ts::complete.
  return Response.json({ code: 0, message: 'ok', data: { ok: true } });
}
