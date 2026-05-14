'use client';

import { useCallback, useReducer } from 'react';

import { useTranslations } from 'next-intl';

import { useAuth } from '@/contexts/auth-context';
import { authClient } from '@/lib/auth/client';
import { isStrongPassword } from '@/lib/auth/password-policy';

import {
  createInitialForgotPasswordState,
  forgotPasswordReducer,
} from './reducer';

import type { ForgotPasswordField, ForgotPasswordState } from './types';

const COOLDOWN_SEC = 60;

function getCooldownUntil() {
  return Date.now() + COOLDOWN_SEC * 1000;
}

export interface ForgotPasswordFlow {
  state: ForgotPasswordState;
  setField: (field: ForgotPasswordField, value: string) => void;
  sendCode: () => Promise<void>;
  resendCode: () => Promise<void>;
  /** Optional `codeOverride` avoids stale `state.otp` when auto-advancing in the same tick as the last digit or a paste. */
  advanceToPassword: (codeOverride?: string) => Promise<void>;
  submitResetPassword: () => Promise<void>;
  goBack: (to: 'email' | 'otp') => void;
}

export function useForgotPasswordFlow(
  defaultEmail: string,
): ForgotPasswordFlow {
  const [state, dispatch] = useReducer(
    forgotPasswordReducer,
    defaultEmail,
    createInitialForgotPasswordState,
  );
  const t = useTranslations('auth.forgotPassword');
  const { sendPasswordResetEmail } = useAuth();

  const setField = useCallback((field: ForgotPasswordField, value: string) => {
    dispatch({ type: 'set', field, value });
  }, []);

  const sendCode = useCallback(async () => {
    if (state.status !== 'idle') return;
    const normalizedEmail = state.email.trim().toLowerCase();
    if (!normalizedEmail) {
      dispatch({ type: 'failure', error: t('emailRequired') });
      return;
    }

    dispatch({ type: 'requestStart', status: 'sending-code' });
    try {
      const result = await sendPasswordResetEmail(normalizedEmail);
      if (!result.success) {
        dispatch({ type: 'failure', error: t('sendResetEmailFailed') });
        return;
      }
      dispatch({
        type: 'sendCodeSuccess',
        email: normalizedEmail,
        cooldownUntil: getCooldownUntil(),
      });
    } catch (error) {
      console.error('[forgot-password] send code failed', error);
      dispatch({ type: 'failure', error: t('unexpectedError') });
    }
  }, [sendPasswordResetEmail, state.email, state.status, t]);

  const resendCode = useCallback(async () => {
    const isCooldownActive =
      typeof state.cooldownUntil === 'number' &&
      state.cooldownUntil > Date.now();
    if (state.status !== 'idle' || isCooldownActive) return;

    dispatch({ type: 'requestStart', status: 'resending-code' });
    try {
      const result = await sendPasswordResetEmail(state.email);
      if (!result.success) {
        dispatch({ type: 'failure', error: t('sendResetEmailFailed') });
        return;
      }
      dispatch({
        type: 'resendCodeSuccess',
        cooldownUntil: getCooldownUntil(),
      });
    } catch (error) {
      console.error('[forgot-password] resend code failed', error);
      dispatch({ type: 'failure', error: t('unexpectedError') });
    }
  }, [
    sendPasswordResetEmail,
    state.cooldownUntil,
    state.email,
    state.status,
    t,
  ]);

  const advanceToPassword = useCallback(
    async (codeOverride?: string) => {
      if (state.status !== 'idle') return;
      const code = (codeOverride ?? state.otp).trim();
      if (!state.email.trim()) {
        dispatch({ type: 'failure', error: t('emailRequired') });
        return;
      }
      if (code.length !== 6) {
        dispatch({ type: 'failure', error: t('codeRequired') });
        return;
      }

      dispatch({ type: 'requestStart', status: 'verifying-otp' });
      try {
        const result = await authClient.emailOtp.checkVerificationOtp({
          email: state.email.trim(),
          type: 'forget-password',
          otp: code,
        });

        if (result?.error) {
          dispatch({ type: 'failure', error: t('invalidOrExpiredCode') });
          return;
        }
        dispatch({ type: 'advanceToPassword' });
      } catch (error) {
        console.error('[forgot-password] verify otp failed', error);
        dispatch({ type: 'failure', error: t('unexpectedError') });
      }
    },
    [state.email, state.otp, state.status, t],
  );

  const submitResetPassword = useCallback(async () => {
    if (state.status !== 'idle') return;
    if (!state.email.trim()) {
      dispatch({ type: 'failure', error: t('emailRequired') });
      return;
    }
    if (!state.otp.trim()) {
      dispatch({ type: 'failure', error: t('codeRequired') });
      return;
    }
    const passwordValid =
      isStrongPassword(state.password) &&
      state.password === state.confirmPassword;
    if (!passwordValid) {
      dispatch({ type: 'failure', error: t('passwordRequirementsNotMet') });
      return;
    }

    dispatch({ type: 'requestStart', status: 'submitting-reset' });
    try {
      const result = await authClient.emailOtp.resetPassword({
        email: state.email.trim(),
        otp: state.otp.trim(),
        password: state.password,
      });

      if (result?.error) {
        dispatch({ type: 'failure', error: t('invalidOrExpiredCode') });
        return;
      }
      dispatch({ type: 'resetSuccess' });
    } catch (error) {
      console.error('[forgot-password] reset password failed', error);
      dispatch({ type: 'failure', error: t('unexpectedError') });
    }
  }, [
    state.confirmPassword,
    state.email,
    state.otp,
    state.password,
    state.status,
    t,
  ]);

  const goBack = useCallback((to: 'email' | 'otp') => {
    dispatch({ type: 'goBack', to });
  }, []);

  return {
    state,
    setField,
    sendCode,
    resendCode,
    advanceToPassword,
    submitResetPassword,
    goBack,
  };
}
