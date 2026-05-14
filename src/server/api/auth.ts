/**
 * Session authentication for Vercel Route Handlers.
 *
 * Auth is resolved from better-auth session cookies/headers via
 * `auth.api.getSession(...)`.
 *
 * On success, handlers receive a typed `AuthUser`. On failure, return the
 * 401 `NextResponse` directly — do NOT try to "continue without user" for
 * `requireAuth` paths.
 *
 * Session cookies must be validated on the server for every protected Route Handler.
 */

import { NextResponse } from 'next/server';

import { ErrorCode } from '@/lib/api/response';

import { auth } from '../../lib/auth/server';

type DecodedIdToken = Record<string, unknown>;

export interface AuthUser {
  uid: string;
  email?: string;
  emailVerified?: boolean;
  /** Raw decoded token for callers that need claims/metadata. */
  token: DecodedIdToken;
}

export type AuthResult =
  | { ok: true; user: AuthUser }
  | { ok: false; response: NextResponse };

export type InternalAuthResult =
  | { ok: true }
  | { ok: false; response: NextResponse };

function unauthorized(message: string): NextResponse {
  // We deliberately return HTTP 401 (not the in-envelope 200 + code=2001)
  // because:
  //   1. fetch / XHR tooling commonly auto-handles 401 (token refresh, etc.)
  //   2. Reverse proxies / monitoring can flag broken auth without parsing.
  // The body uses shared auth error code `2001` so frontend handlers that
  // branch on business error codes continue to work across all API paths.
  return NextResponse.json(
    { code: ErrorCode.UNAUTHORIZED, message, data: null },
    { status: 401 },
  );
}

/**
 * Verify the request's Bearer token. Use in routes that REQUIRE auth.
 *
 *   const auth = await requireAuth(req);
 *   if (!auth.ok) return auth.response;
 *   const { uid } = auth.user;
 */
export async function requireAuth(req: Request): Promise<AuthResult> {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      return {
        ok: false,
        response: unauthorized('Invalid or expired session'),
      };
    }
    return {
      ok: true,
      user: {
        uid: session.user.id,
        email: session.user.email ?? undefined,
        emailVerified: Boolean(session.user.emailVerified),
        token: session as DecodedIdToken,
      },
    };
  } catch (error) {
    console.warn('[requireAuth] getSession failed:', error);
    return {
      ok: false,
      response: unauthorized('Invalid or expired session'),
    };
  }
}

/**
 * Try to verify the request's Bearer token. Use in routes that work with OR
 * without auth (e.g. `/api/feedback` accepts anonymous submissions).
 *
 *   const user = await tryAuth(req);
 *   if (user) { /* logged-in flow *\/ }
 */
export async function tryAuth(req: Request): Promise<AuthUser | null> {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) return null;
    return {
      uid: session.user.id,
      email: session.user.email ?? undefined,
      emailVerified: Boolean(session.user.emailVerified),
      token: session as DecodedIdToken,
    };
  } catch {
    return null;
  }
}

/**
 * Extract client IP from a Vercel request. Vercel forwards the original IP
 * via `x-forwarded-for` (left-most entry) and additionally `x-real-ip`.
 *
 * Same heuristic as `src/server/handlers/verify-info.ts` (login audit).
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  const real = req.headers.get('x-real-ip');
  if (real) return real;
  return 'unknown';
}

export function getUserAgent(req: Request): string {
  return req.headers.get('user-agent') ?? 'Unknown';
}

/**
 * Verify internal bridge requests from trusted backends (e.g. worker or
 * automation calling into Next.js with a shared secret).
 *
 * Header: `x-internal-secret: <INTERNAL_API_SECRET>`
 */
export function requireInternalAuth(req: Request): InternalAuthResult {
  const expected = process.env.INTERNAL_API_SECRET?.trim();
  if (!expected) {
    console.error(
      '[requireInternalAuth] INTERNAL_API_SECRET is not configured',
    );
    return {
      ok: false,
      response: unauthorized('Internal service unavailable'),
    };
  }

  const provided = req.headers.get('x-internal-secret')?.trim();
  if (!provided || provided !== expected) {
    return {
      ok: false,
      response: unauthorized('Invalid internal authorization'),
    };
  }

  return { ok: true };
}

/**
 * Verify cron invocations from Vercel Cron or manual smoke calls.
 *
 * Supported header:
 * - `authorization: Bearer <CRON_SECRET>`
 */
export function requireCronAuth(req: Request): InternalAuthResult {
  const expected = process.env.CRON_SECRET?.trim();
  if (!expected) {
    console.error('[requireCronAuth] CRON_SECRET is not configured');
    return {
      ok: false,
      response: unauthorized('Internal service unavailable'),
    };
  }

  const authHeader = req.headers.get('authorization');
  const fromBearer = authHeader?.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length).trim()
    : null;
  const provided = fromBearer;

  if (!provided || provided !== expected) {
    return {
      ok: false,
      response: unauthorized('Invalid internal authorization'),
    };
  }

  return { ok: true };
}
