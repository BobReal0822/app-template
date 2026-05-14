import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { toNextJsHandler } from 'better-auth/next-js';
import { customSession, emailOTP } from 'better-auth/plugins';

import { AUTH_RUNTIME } from '@/server/config/runtime';
import {
  emailLocaleFromRequest,
  sendResetPasswordOtpEmail,
  sendVerificationOtpEmail,
} from '@/server/email';
import { enqueue } from '@/server/queue/enqueue';
import { getDbTransaction } from '@app/db/client';
import {
  authAccount,
  authSession,
  authUser,
  authVerification,
} from '@app/db/schema';

// Better-auth's Drizzle adapter binds to a Drizzle instance, not a raw Pool.
// We use `getDbTransaction()` (WebSocket pool via `drizzle-orm/neon-serverless`)
// rather than `getDbHttp()` because:
//   1. better-auth wraps the user + account insert in a transaction when
//      `transaction: true` is set, and the Neon HTTP driver does not support
//      multi-statement transactions.
//   2. The WebSocket pool is already cached as a singleton in `@app/db`,
//      so this adds no extra connection overhead.
const { db } = getDbTransaction();

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(
      `[auth/server] Missing required environment variable: ${name}`,
    );
    throw new Error('Auth configuration error');
  }
  return value;
}

function parseOrigin(raw: string | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

const appOrigin =
  parseOrigin(process.env.BETTER_AUTH_URL) ||
  parseOrigin(process.env.NEXT_PUBLIC_APP_URL);
const trustedOrigins = Array.from(
  new Set([
    ...(appOrigin ? [appOrigin] : []),
    ...(process.env.NODE_ENV === 'development'
      ? ['http://localhost:3000']
      : []),
  ]),
);

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    // Map better-auth's internal model keys (`user` / `session` / `account` /
    // `verification`) to our namespaced Drizzle tables (`auth_user`, …). The
    // physical tables are namespaced to avoid collision with this app's
    // domain `users` table — see `packages/db/src/schema/auth.ts` for the
    // full rationale.
    schema: {
      user: authUser,
      session: authSession,
      account: authAccount,
      verification: authVerification,
    },
    // Atomic user+account creation: if the account insert fails, the user
    // row is rolled back instead of orphaned. The Neon WebSocket pool
    // driver supports `db.transaction()`.
    transaction: true,
  }),
  secret: getRequiredEnv('BETTER_AUTH_SECRET'),
  baseURL: process.env.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    autoSignIn: false,
  },
  session: {
    // Sign the session payload directly into the auth cookie so server-side
    // session reads (RSC layouts, middleware, every API route's `requireAuth`)
    // can verify auth without hitting the DB. Within the `maxAge` window the
    // cookie is the source of truth; outside it, better-auth falls back to
    // the `auth_session` table.
    //
    // Staleness footprint with 60s maxAge:
    //   - `auth_user.{email,name,image,emailVerified}` may lag up to 60s
    //     after a profile edit (acceptable; non-critical UI fields).
    //   - Plan / credits / role live in the *business* `users` table
    //     (populated via `databaseHooks.user.create.after` → queue worker),
    //     which is read directly from PG on every request — **not affected**
    //     by this cache.
    //   - Forced sign-out / session revocation has up to 60s of latency.
    //     For surgical "must be fresh" reads, pass `disableCookieCache: true`
    //     to `auth.api.getSession({ headers, query: ... })`.
    //
    // Tune `maxAge` shorter (e.g. 30) if revocation latency becomes a
    // concern, longer (e.g. 300) if DB load on session reads becomes one.
    cookieCache: {
      enabled: true,
      maxAge: AUTH_RUNTIME.SESSION_COOKIE_CACHE_MAX_AGE_SECONDS,
    },
  },
  plugins: [
    emailOTP({
      otpLength: AUTH_RUNTIME.OTP_LENGTH,
      expiresIn: AUTH_RUNTIME.OTP_EXPIRES_SECONDS,
      sendVerificationOnSignUp: false,
      allowedAttempts: AUTH_RUNTIME.OTP_MAX_ATTEMPTS,
      async sendVerificationOTP({
        email,
        otp,
        type,
      }: {
        email: string;
        otp: string;
        type: string;
      }) {
        const locale = await emailLocaleFromRequest();
        if (type === 'forget-password') {
          await sendResetPasswordOtpEmail(email, otp, locale);
          return;
        }
        if (type === 'email-verification') {
          await sendVerificationOtpEmail(email, otp, locale);
          return;
        }
        throw new Error('Passwordless sign-in not enabled');
      },
    }),
    // Slim down the `/api/auth/get-session` payload (and `auth.api.getSession()`
    // result) to only the fields the client/UI actually reads. Drops:
    //   - session.token (already in the httpOnly cookie; never used by JS)
    //   - session.id, ipAddress, userAgent, createdAt, updatedAt, userId
    //     (server-only audit fields; UI never reads them)
    //   - user.createdAt / updatedAt (UI never reads them)
    //
    // Cookie refresh / session extension still runs inside better-auth's core
    // before this projection, so Set-Cookie headers and DB session lifetime
    // are unaffected. Server-side `requireAuth` / `getCurrentUser` keep
    // working — they only read user.{id,email,emailVerified,name,image}.
    customSession(async ({ user, session }) => ({
      user: {
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
        name: user.name,
        image: user.image,
      },
      session: {
        expiresAt: session.expiresAt,
      },
    })),
  ],
  socialProviders: {
    google: {
      clientId: getRequiredEnv('GOOGLE_CLIENT_ID'),
      clientSecret: getRequiredEnv('GOOGLE_CLIENT_SECRET'),
    },
  },
  trustedOrigins,
  databaseHooks: {
    user: {
      create: {
        after: async (createdUser: {
          id: string;
          email?: string | null;
          name?: string | null;
        }) => {
          const locale = await emailLocaleFromRequest();
          await enqueue(
            'user-created-work',
            {
              uid: createdUser.id,
              email: createdUser.email ?? null,
              emailVerified: true,
              displayName: createdUser.name ?? null,
              photoURL: null,
              locale,
            },
            {
              idempotencyKey: `user-created:${createdUser.id}`,
              retentionSeconds: 7 * 24 * 60 * 60,
            },
          );
        },
      },
    },
  },
});

export const { GET: authGetHandler, POST: authPostHandler } =
  toNextJsHandler(auth);
