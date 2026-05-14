'use client';

import { useCallback, useReducer } from 'react';

import { useLocale, useTranslations } from 'next-intl';

import { useAuth } from '@/contexts/auth-context';
import { useRouter } from '@/i18n/routing';
import { isStrongPassword } from '@/lib/auth/password-policy';

import { initialSignUpState, signUpReducer } from './reducer';

import type { SignUpField, SignUpState } from './types';

const COOLDOWN_SEC = 60;

function getCooldownUntil(): number {
  return Date.now() + COOLDOWN_SEC * 1000;
}

interface VerifyOtpResponseBody {
  data?: { code?: string; registrationToken?: string };
}

interface CompleteResponseBody {
  data?: { code?: string };
}

export interface SignUpFlow {
  state: SignUpState;
  setField: (field: SignUpField, value: string) => void;
  sendOtp: () => Promise<void>;
  resendOtp: () => Promise<void>;
  /**
   * Optional `codeOverride` lets callers pass the freshly-typed OTP without
   * waiting for the reducer to commit. Required for the auto-submit path,
   * where `OtpStep.handleOtpChange` dispatches the new value and immediately
   * triggers verification within the same React event — at that point the
   * `useCallback` closure still sees the pre-dispatch (5-digit) `state.otp`.
   */
  verifyOtp: (codeOverride?: string) => Promise<void>;
  complete: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  goBack: (to: 'email' | 'otp') => void;
}

/**
 * Encapsulates the entire 3-step sign-up flow: state machine, API calls,
 * error code mapping, OTP cooldown timer, and post-success navigation.
 *
 * Per security rules, all backend errors are mapped to localized user-facing
 * strings; nothing returned from `fetch` is surfaced verbatim.
 */
export function useSignUpFlow(): SignUpFlow {
  const [state, dispatch] = useReducer(signUpReducer, initialSignUpState);
  const t = useTranslations('auth.signup');
  const locale = useLocale();
  const { signIn, googleSignIn } = useAuth();
  const router = useRouter();

  const setField = useCallback((field: SignUpField, value: string) => {
    dispatch({ type: 'set', field, value });
  }, []);

  const sendOtp = useCallback(async () => {
    if (state.status !== 'idle') return;
    const normalizedEmail = state.email.trim().toLowerCase();
    if (!normalizedEmail) {
      dispatch({ type: 'failure', error: t('signUpFailed') });
      return;
    }
    dispatch({ type: 'requestStart', status: 'sending-otp' });
    try {
      const response = await fetch('/api/auth/register/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, locale }),
      });
      if (!response.ok) {
        dispatch({ type: 'failure', error: t('signUpFailed') });
        return;
      }
      dispatch({
        type: 'sendOtpSuccess',
        email: normalizedEmail,
        cooldownUntil: getCooldownUntil(),
      });
    } catch (error) {
      console.error('[signup] send-otp failed', error);
      dispatch({ type: 'failure', error: t('signUpFailed') });
    }
  }, [locale, state.email, state.status, t]);

  const resendOtp = useCallback(async () => {
    const isCooldownActive =
      typeof state.cooldownUntil === 'number' &&
      state.cooldownUntil > Date.now();
    if (state.status !== 'idle' || isCooldownActive) return;
    dispatch({ type: 'requestStart', status: 'resending-otp' });
    try {
      const response = await fetch('/api/auth/register/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: state.email, locale }),
      });
      if (!response.ok) {
        dispatch({ type: 'failure', error: t('signUpFailed') });
        return;
      }
      dispatch({
        type: 'resendOtpSuccess',
        cooldownUntil: getCooldownUntil(),
      });
    } catch (error) {
      console.error('[signup] resend-otp failed', error);
      dispatch({ type: 'failure', error: t('signUpFailed') });
    }
  }, [locale, state.cooldownUntil, state.email, state.status, t]);

  const verifyOtp = useCallback(
    async (codeOverride?: string) => {
      if (state.status !== 'idle') return;
      // Prefer the explicit override (auto-submit path) so we don't read a
      // stale `state.otp` from the closure when the user just typed the 6th
      // digit in the same event tick.
      const code = (codeOverride ?? state.otp).trim();
      if (code.length !== 6) return;

      dispatch({ type: 'requestStart', status: 'verifying-otp' });
      try {
        const response = await fetch('/api/auth/register/verify-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: state.email, otp: code }),
        });
        const payload = (await response
          .json()
          .catch(() => null)) as VerifyOtpResponseBody | null;

        if (!response.ok) {
          const errorCode = payload?.data?.code;
          if (errorCode === 'locked') {
            dispatch({ type: 'failure', error: t('otpLocked') });
          } else if (errorCode === 'existing_account') {
            dispatch({
              type: 'failure',
              error: t('accountExists'),
              resetTo: 'email',
            });
          } else if (errorCode === 'expired') {
            dispatch({
              type: 'failure',
              error: t('otpExpired'),
              resetTo: 'email',
            });
          } else {
            dispatch({ type: 'failure', error: t('otpInvalid') });
          }
          return;
        }

        const token = payload?.data?.registrationToken;
        if (!token) {
          dispatch({ type: 'failure', error: t('otpInvalid') });
          return;
        }

        dispatch({ type: 'verifyOtpSuccess', registrationToken: token });
      } catch (error) {
        console.error('[signup] verify-otp failed', error);
        dispatch({ type: 'failure', error: t('otpInvalid') });
      }
    },
    [state.email, state.otp, state.status, t],
  );

  const complete = useCallback(async () => {
    if (state.status !== 'idle') return;
    if (!state.registrationToken) {
      dispatch({
        type: 'failure',
        error: t('registrationExpired'),
        resetTo: 'email',
      });
      return;
    }
    if (state.password !== state.repeatPassword) {
      dispatch({ type: 'failure', error: t('passwordMismatch') });
      return;
    }
    if (!isStrongPassword(state.password)) {
      dispatch({ type: 'failure', error: t('passwordTooWeak') });
      return;
    }

    dispatch({ type: 'requestStart', status: 'completing' });
    try {
      const response = await fetch('/api/auth/register/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registrationToken: state.registrationToken,
          password: state.password,
        }),
      });
      const payload = (await response
        .json()
        .catch(() => null)) as CompleteResponseBody | null;
      if (!response.ok) {
        const errorCode = payload?.data?.code;
        if (errorCode === 'email_taken') {
          dispatch({
            type: 'failure',
            error: t('accountExists'),
            resetTo: 'email',
          });
          return;
        }
        if (response.status === 400 || response.status === 401) {
          dispatch({
            type: 'failure',
            error: t('registrationExpired'),
            resetTo: 'email',
          });
          return;
        }
        dispatch({ type: 'failure', error: t('signUpFailed') });
        return;
      }

      // Account is created. Sign in via better-auth's canonical client so the
      // React session store updates through its standard path; this avoids
      // the "logged-in cookie set, but useSession() still null" gap that a
      // raw server-side sign-in would create.
      const signInResult = await signIn(state.email, state.password);
      if (!signInResult.success) {
        // Rare edge: registration succeeded but auto sign-in didn't (network
        // hiccup, etc.). Credentials are valid; route the user to login.
        console.error(
          '[signup] auto sign-in after register failed:',
          signInResult.error,
        );
        dispatch({ type: 'failure', error: t('autoSignInFailed') });
        return;
      }

      // Intentionally leave status as `completing` so the submit button stays
      // disabled across the navigation transition. `router.push` is non-blocking,
      // and reverting to `idle` here would briefly re-enable the button and allow
      // a duplicate submission before the form unmounts.
      router.push('/app');
    } catch (error) {
      console.error('[signup] complete failed', error);
      dispatch({ type: 'failure', error: t('signUpFailed') });
    }
  }, [
    router,
    signIn,
    state.email,
    state.password,
    state.registrationToken,
    state.repeatPassword,
    state.status,
    t,
  ]);

  const signInWithGoogle = useCallback(async () => {
    if (state.status !== 'idle') return;
    dispatch({ type: 'requestStart', status: 'google' });
    try {
      const result = await googleSignIn();
      if (!result.success) {
        dispatch({ type: 'failure', error: t('googleLoginError') });
        return;
      }
      // Google OAuth owns navigation via callbackURL. Avoid an extra push
      // here to prevent a brief same-page refresh/flicker before /app.
      return;
    } catch (error) {
      console.error('[signup] google sign-in failed', error);
      dispatch({ type: 'failure', error: t('googleUnavailable') });
    }
  }, [googleSignIn, state.status, t]);

  const goBack = useCallback((to: 'email' | 'otp') => {
    dispatch({ type: 'goBack', to });
  }, []);

  return {
    state,
    setField,
    sendOtp,
    resendOtp,
    verifyOtp,
    complete,
    signInWithGoogle,
    goBack,
  };
}
