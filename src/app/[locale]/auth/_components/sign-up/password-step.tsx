'use client';

import { type FormEvent, useEffect, useRef } from 'react';

import { ChevronLeft, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { FeedbackAlert } from '@/components/app/feedback-alert';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

import { PasswordInput } from '../_share/password-input';
import { PasswordRequirementsChecklist } from '../_share/password-requirements-checklist';
import { usePasswordStrength } from '../_share/use-password-strength';

interface PasswordStepProps {
  password: string;
  repeatPassword: string;
  error: string | null;
  isSubmitting: boolean;
  isAnyLoading: boolean;
  onPasswordChange: (value: string) => void;
  onRepeatPasswordChange: (value: string) => void;
  onBackToVerification: () => void;
  onSubmit: () => void;
}

export function PasswordStep({
  password,
  repeatPassword,
  error,
  isSubmitting,
  isAnyLoading,
  onPasswordChange,
  onRepeatPasswordChange,
  onBackToVerification,
  onSubmit,
}: PasswordStepProps) {
  const t = useTranslations('auth.signup');
  const { requirements, isValid } = usePasswordStrength(
    password,
    repeatPassword,
  );
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    passwordRef.current?.focus({ preventScroll: true });
  }, []);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit();
  };

  const canSubmit = isValid && !isAnyLoading;

  return (
    <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on">
      <div className="flex flex-col gap-2">
        <Label htmlFor="password" className="block text-sm font-medium">
          {t('password')}
        </Label>
        <PasswordInput
          ref={passwordRef}
          id="password"
          name="new-password"
          placeholder={t('passwordPlaceholder')}
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          showLabel={t('ariaShowPassword')}
          hideLabel={t('ariaHidePassword')}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="repeatPassword" className="block text-sm font-medium">
          {t('repeatPassword')}
        </Label>
        <PasswordInput
          id="repeatPassword"
          name="new-password-confirmation"
          placeholder={t('repeatPasswordPlaceholder')}
          required
          minLength={8}
          autoComplete="new-password"
          value={repeatPassword}
          onChange={(e) => onRepeatPasswordChange(e.target.value)}
          showLabel={t('ariaShowRepeatPassword')}
          hideLabel={t('ariaHideRepeatPassword')}
        />
      </div>

      {/* Always render the checklist so users see the rules before typing
          and don't get a layout jump when the first character lands. */}
      <PasswordRequirementsChecklist
        requirements={requirements}
        title={t('passwordRequirementsTitle')}
        translateRequirement={(key) => t(key)}
      />

      {error && <FeedbackAlert description={error} />}
      <Button
        type="submit"
        className="h-11 w-full font-medium"
        disabled={!canSubmit}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t('completingRegistration')}
          </>
        ) : (
          t('completeRegistration')
        )}
      </Button>
      <Button
        type="button"
        variant="ghost"
        className="h-9 w-full text-sm text-muted-foreground transition-colors hover:text-foreground"
        disabled={isAnyLoading}
        onClick={onBackToVerification}
      >
        <ChevronLeft className="mr-1 h-4 w-4" />
        {t('backToVerification')}
      </Button>
    </form>
  );
}
