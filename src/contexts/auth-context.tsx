'use client';

import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useMemo,
} from 'react';

import { recordLoginInfo } from '@/lib/api/client';
import { authClient } from '@/lib/auth/client';

const AUTH_ERROR_CODES = {
  SIGN_IN_FAILED: 'sign_in_failed',
  SIGN_UP_FAILED: 'sign_up_failed',
  GOOGLE_SIGN_IN_FAILED: 'google_sign_in_failed',
  SIGN_OUT_FAILED: 'sign_out_failed',
  PASSWORD_RESET_REQUEST_FAILED: 'password_reset_request_failed',
} as const;

function getGoogleSignInCallbackUrl(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (appUrl) {
    try {
      return new URL('/app', appUrl).toString();
    } catch (error) {
      console.warn('[auth] Invalid NEXT_PUBLIC_APP_URL, fallback to origin', {
        error,
      });
    }
  }

  if (typeof window !== 'undefined') {
    return new URL('/app', window.location.origin).toString();
  }

  return '/app';
}

export interface AuthUser {
  uid: string;
  email?: string | null;
  emailVerified?: boolean;
  name?: string | null;
  image?: string | null;
}

export interface AuthResult {
  success: boolean;
  error?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signIn(email: string, password: string): Promise<AuthResult>;
  signUp(email: string, password: string): Promise<AuthResult>;
  googleSignIn(): Promise<AuthResult>;
  signOut(): Promise<{ success: boolean; error?: string }>;
  sendPasswordResetEmail(
    email: string,
  ): Promise<{ success: boolean; error?: string }>;
  /**
   * Force-refresh the better-auth client session store from the server.
   *
   * Use this after any flow that mutates the auth state via a custom API
   * route (instead of `authClient.signIn.*` / `signUp.*`) — e.g. the OTP-based
   * registration completion at `/api/auth/register/complete`. Those routes
   * set the session cookie server-side, but the React client's nanostore
   * doesn't observe the cookie change, so `useSession()` keeps returning the
   * pre-login state until the next hard reload. Calling this primes the
   * store so subsequent navigations render with `user` populated.
   *
   * Always non-throwing: refresh failures are logged and swallowed.
   */
  refreshSession(): Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const sessionState = authClient.useSession();

  const sessionUser = sessionState?.data?.user;
  // Depend on primitive fields rather than the `sessionUser` object reference.
  // better-auth's session atom returns a fresh object on every refetch (even
  // when the underlying values are identical), and a fresh `user` reference
  // would cascade into every downstream consumer's `useEffect([user])` —
  // most notably `useUserDataStandalone`, which would re-fetch
  // `/api/user/profile` on every refetch. Keying on primitives makes the
  // memoized `user` referentially stable across no-op refetches.
  const user = useMemo<AuthUser | null>(() => {
    if (!sessionUser?.id) return null;
    return {
      uid: sessionUser.id,
      email: sessionUser.email ?? null,
      emailVerified: Boolean(sessionUser.emailVerified),
      name: sessionUser.name ?? null,
      image: sessionUser.image ?? null,
    };
  }, [
    sessionUser?.id,
    sessionUser?.email,
    sessionUser?.emailVerified,
    sessionUser?.name,
    sessionUser?.image,
  ]);

  const loading = Boolean(sessionState?.isPending);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const result = await authClient.signIn.email({
        email,
        password,
      });
      if (result?.error) {
        console.error('[auth] signIn failed', result.error);
        return {
          success: false,
          error: AUTH_ERROR_CODES.SIGN_IN_FAILED,
        };
      }
      recordLoginInfo().catch(() => {});
      return { success: true };
    } catch (error) {
      console.error('[auth] signIn failed', error);
      return {
        success: false,
        error: AUTH_ERROR_CODES.SIGN_IN_FAILED,
      };
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    try {
      const result = await authClient.signUp.email({
        email,
        password,
        name: email.split('@')[0] || email,
      });
      if (result?.error) {
        console.error('[auth] signUp failed', result.error);
        return {
          success: false,
          error: AUTH_ERROR_CODES.SIGN_UP_FAILED,
        };
      }
      return { success: true };
    } catch (error) {
      console.error('[auth] signUp failed', error);
      return {
        success: false,
        error: AUTH_ERROR_CODES.SIGN_UP_FAILED,
      };
    }
  }, []);

  const googleSignIn = useCallback(async () => {
    try {
      const result = await authClient.signIn.social({
        provider: 'google',
        callbackURL: getGoogleSignInCallbackUrl(),
      });
      if (result?.error) {
        console.error('[auth] googleSignIn failed', result.error);
        return {
          success: false,
          error: AUTH_ERROR_CODES.GOOGLE_SIGN_IN_FAILED,
        };
      }
      recordLoginInfo().catch(() => {});
      return { success: true };
    } catch (error) {
      console.error('[auth] googleSignIn failed', error);
      return {
        success: false,
        error: AUTH_ERROR_CODES.GOOGLE_SIGN_IN_FAILED,
      };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      const result = await authClient.signOut();
      if (result?.error) {
        console.error('[auth] signOut failed', result.error);
        return {
          success: false,
          error: AUTH_ERROR_CODES.SIGN_OUT_FAILED,
        };
      }
      return { success: true };
    } catch (error) {
      console.error('[auth] signOut failed', error);
      return {
        success: false,
        error: AUTH_ERROR_CODES.SIGN_OUT_FAILED,
      };
    }
  }, []);

  const sendPasswordResetEmail = useCallback(async (email: string) => {
    try {
      const result = await authClient.emailOtp.requestPasswordReset({
        email,
      });
      if (result?.error) {
        console.error('[auth] sendPasswordResetEmail failed', result.error);
        return {
          success: false,
          error: AUTH_ERROR_CODES.PASSWORD_RESET_REQUEST_FAILED,
        };
      }
      return { success: true };
    } catch (error) {
      console.error('[auth] sendPasswordResetEmail failed', error);
      return {
        success: false,
        error: AUTH_ERROR_CODES.PASSWORD_RESET_REQUEST_FAILED,
      };
    }
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      await authClient.getSession({
        query: { disableCookieCache: true },
      });
    } catch (error) {
      console.error('[auth] refreshSession failed', error);
    }
  }, []);

  const value: AuthContextType = {
    user,
    loading,
    signIn,
    signUp,
    googleSignIn,
    signOut,
    sendPasswordResetEmail,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function useIsAuthenticated() {
  const { loading, user } = useAuth();
  return { isAuthenticated: Boolean(user), loading };
}
