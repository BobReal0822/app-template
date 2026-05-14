'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useTranslations } from 'next-intl';

import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { Link } from '@/i18n/routing';

import { AuthStepProgress } from '../_share/step-progress';

import { EmailStep } from './email-step';
import { OtpStep } from './otp-step';
import { PasswordStep } from './password-step';
import { StepHeader } from './step-header';
import { SIGN_UP_STEPS, STEP_INDEX } from './types';
import { useSignUpFlow } from './use-sign-up-flow';

export function SignUpForm() {
  const t = useTranslations('auth.signup');
  const prefersReducedMotion = useReducedMotion();

  const {
    state,
    setField,
    sendOtp,
    resendOtp,
    verifyOtp,
    complete,
    signInWithGoogle,
    goBack,
  } = useSignUpFlow();

  const { step, direction, status, error } = state;
  const isAnyLoading = status !== 'idle';

  const motionInitial = prefersReducedMotion
    ? { opacity: 1, x: 0 }
    : { opacity: 0, x: direction > 0 ? 12 : -12 };
  const motionAnimate = { opacity: 1, x: 0 };
  const motionExit = prefersReducedMotion
    ? { opacity: 1, x: 0 }
    : { opacity: 0, x: direction > 0 ? -12 : 12 };

  return (
    <div className="w-full max-w-sm">
      {/* StepProgress and StepHeader sit outside AnimatePresence so they
          don't slide along with the step body — only the form itself
          transitions on step change. */}
      <AuthStepProgress
        activeIndex={STEP_INDEX[step]}
        totalSteps={SIGN_UP_STEPS.length}
        label={t('stepIndicatorLabel')}
      />
      <StepHeader step={step} email={state.email} />

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={step}
          initial={motionInitial}
          animate={motionAnimate}
          exit={motionExit}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          {step === 'email' ? (
            <EmailStep
              email={state.email}
              error={error}
              isSubmitting={status === 'sending-otp'}
              isGoogleLoading={status === 'google'}
              isAnyLoading={isAnyLoading}
              onEmailChange={(value) => setField('email', value)}
              onGoogleLogin={signInWithGoogle}
              onSubmit={sendOtp}
            />
          ) : step === 'otp' ? (
            <OtpStep
              otp={state.otp}
              error={error}
              isVerifying={status === 'verifying-otp'}
              isResending={status === 'resending-otp'}
              isAnyLoading={isAnyLoading}
              cooldownUntil={state.cooldownUntil}
              onOtpChange={(value) => setField('otp', value)}
              onResendOtp={resendOtp}
              onBackToEmail={() => goBack('email')}
              onSubmit={verifyOtp}
            />
          ) : (
            <PasswordStep
              password={state.password}
              repeatPassword={state.repeatPassword}
              error={error}
              isSubmitting={status === 'completing'}
              isAnyLoading={isAnyLoading}
              onPasswordChange={(value) => setField('password', value)}
              onRepeatPasswordChange={(value) =>
                setField('repeatPassword', value)
              }
              onBackToVerification={() => goBack('otp')}
              onSubmit={complete}
            />
          )}
        </motion.div>
      </AnimatePresence>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        {t('alreadyHaveAccount')}{' '}
        <Link
          href="/auth/login"
          className="font-semibold text-link transition-colors hover:text-link/80"
        >
          {t('login')}
        </Link>
      </p>
    </div>
  );
}
