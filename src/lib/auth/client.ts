import {
  customSessionClient,
  emailOTPClient,
} from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function ensureAuthPath(base: string): string {
  const normalized = trimTrailingSlash(base);
  return normalized.endsWith('/api/auth')
    ? normalized
    : `${normalized}/api/auth`;
}

function getAuthClientBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return ensureAuthPath(window.location.origin);
  }

  const fromEnv =
    process.env.BETTER_AUTH_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (fromEnv && /^https?:\/\//.test(fromEnv)) {
    return ensureAuthPath(fromEnv);
  }

  throw new Error(
    '[authClient] Missing valid BETTER_AUTH_URL (or NEXT_PUBLIC_APP_URL) for server/build context.',
  );
}

export const authClient = createAuthClient({
  baseURL: getAuthClientBaseUrl(),
  plugins: [customSessionClient(), emailOTPClient()],
  // Disable better-auth's default refetch triggers. By default `useSession()`
  // refetches `/api/auth/get-session` on every `visibilitychange` (DevTools
  // focus, tab switch, window focus) and on online/offline transitions, which
  // produces a steady stream of network requests during normal browsing.
  //
  // The session cookie is still server-side cached (`session.cookieCache.maxAge = 60`)
  // so identity reads inside the cookie window don't hit the DB. When a flow
  // genuinely needs a fresh server check (e.g. OTP-completed registration),
  // we already call `authClient.getSession({ query: { disableCookieCache: true } })`
  // explicitly via `AuthContext.refreshSession()`.
  sessionOptions: {
    refetchOnWindowFocus: false,
    refetchWhenOffline: false,
  },
});
