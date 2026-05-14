'use client';

import { useTranslations } from 'next-intl';

import type { ForgotPasswordStep } from './types';

interface StepHeaderProps {
  step: ForgotPasswordStep;
  email: string;
}

export function StepHeader({ step, email }: StepHeaderProps) {
  const t = useTranslations('auth.forgotPassword');

  return (
    <div className="mb-6">
      <h1 className="text-xl font-semibold tracking-normal text-foreground">
        {step === 'email'
          ? t('mainTitle')
          : step === 'otp'
            ? t('otpTitle')
            : t('passwordStepTitle')}
      </h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        {step === 'email'
          ? t('mainDescription')
          : step === 'otp'
            ? t.rich('otpDescription', {
                email,
                highlight: (chunks) => (
                  <span className="font-medium text-foreground break-all">
                    {chunks}
                  </span>
                ),
              })
            : t.rich('passwordStepDescription', {
                email,
                highlight: (chunks) => (
                  <span className="font-medium text-foreground break-all">
                    {chunks}
                  </span>
                ),
              })}
      </p>
    </div>
  );
}
