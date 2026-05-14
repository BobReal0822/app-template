'use client';

import { useEffect } from 'react';

import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';

import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { Link, useRouter } from '@/i18n/routing';

import { AuthStepProgress } from '../_share/step-progress';

import { EmailStep } from './email-step';
import { OtpStep } from './otp-step';
import { PasswordStep } from './password-step';
import { StepHeader } from './step-header';
import { FORGOT_PASSWORD_STEPS, STEP_INDEX } from './types';
import { useForgotPasswordFlow } from './use-forgot-password-flow';

const SUCCESS_REDIRECT_DELAY_MS = 3000;

export function ForgotPasswordForm() {
  const t = useTranslations('auth.forgotPassword');
  const searchParams = useSearchParams();
  const defaultEmail = searchParams.get('email')?.trim().toLowerCase() ?? '';
  const prefersReducedMotion = useReducedMotion();
  const router = useRouter();

  const {
    state,
    setField,
    sendCode,
    resendCode,
    advanceToPassword,
    submitResetPassword,
    goBack,
  } = useForgotPasswordFlow(defaultEmail);

  const { step, direction, status, error, success } = state;
  const isAnyLoading = status !== 'idle';

  useEffect(() => {
    if (!success) return;
    const timer = window.setTimeout(() => {
      router.push('/auth/login');
    }, SUCCESS_REDIRECT_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [router, success]);

  if (success) {
    return (
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-success/15">
          <CheckCircle2 className="h-8 w-8 text-success" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {t('successTitle')}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {t('successDescription')}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          {t('redirectingToLogin')}
        </p>
        <div className="mt-8">
          <Button asChild className="h-11 w-full">
            <Link href="/auth/login">{t('login')}</Link>
          </Button>
        </div>
      </div>
    );
  }

  const motionInitial = prefersReducedMotion
    ? { opacity: 1, x: 0 }
    : { opacity: 0, x: direction > 0 ? 12 : -12 };
  const motionAnimate = { opacity: 1, x: 0 };
  const motionExit = prefersReducedMotion
    ? { opacity: 1, x: 0 }
    : { opacity: 0, x: direction > 0 ? -12 : 12 };

  return (
    <div className="w-full max-w-sm">
      <Link
        href="/auth/login"
        className="mb-8 inline-flex items-center text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        {t('backToLogin')}
      </Link>

      <AuthStepProgress
        activeIndex={STEP_INDEX[step]}
        totalSteps={FORGOT_PASSWORD_STEPS.length}
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
              isSubmitting={status === 'sending-code'}
              isAnyLoading={isAnyLoading}
              onEmailChange={(value) => setField('email', value)}
              onSubmit={sendCode}
            />
          ) : step === 'otp' ? (
            <OtpStep
              otp={state.otp}
              error={error}
              isVerifying={status === 'verifying-otp'}
              isResending={status === 'resending-code'}
              isAnyLoading={isAnyLoading}
              cooldownUntil={state.cooldownUntil}
              onOtpChange={(value) => setField('otp', value)}
              onResendCode={resendCode}
              onBackToEmail={() => goBack('email')}
              onSubmit={advanceToPassword}
            />
          ) : (
            <PasswordStep
              password={state.password}
              confirmPassword={state.confirmPassword}
              error={error}
              isSubmitting={status === 'submitting-reset'}
              isAnyLoading={isAnyLoading}
              onPasswordChange={(value) => setField('password', value)}
              onConfirmPasswordChange={(value) =>
                setField('confirmPassword', value)
              }
              onBackToVerification={() => goBack('otp')}
              onSubmit={submitResetPassword}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
