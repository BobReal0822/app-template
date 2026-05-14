'use client';

import { type ReactNode } from 'react';

import { useTranslations } from 'next-intl';

import type { SignUpStep } from './types';

interface StepHeaderProps {
  step: SignUpStep;
  email: string;
}

export function StepHeader({ step, email }: StepHeaderProps) {
  const t = useTranslations('auth.signup');

  const emailEmphasis = (chunks: ReactNode) => (
    <span className="font-medium text-foreground break-all">{chunks}</span>
  );

  let title: string;
  let description: ReactNode;
  switch (step) {
    case 'email':
      title = t('mainTitle');
      description = t('mainDescription');
      break;
    case 'otp':
      title = t('otpTitle');
      description = t.rich('otpDescription', {
        email,
        highlight: emailEmphasis,
      });
      break;
    case 'password':
      title = t('passwordStepTitle');
      description = t.rich('passwordStepDescription', {
        email,
        highlight: emailEmphasis,
      });
      break;
  }

  return (
    <div className="mb-6">
      <h1 className="text-xl font-semibold tracking-normal text-foreground">
        {title}
      </h1>
      <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
