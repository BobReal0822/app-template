'use client';

import type React from 'react';
import { useEffect, useState } from 'react';

import { CheckCircle2, Loader2, Lock } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { FeedbackAlert } from '@/components/app/feedback-alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { Link, useRouter } from '@/i18n/routing';
import { authClient } from '@/lib/auth/client';

import { OtpInput6 } from './_share/otp-input-6';
import { PasswordInput } from './_share/password-input';
import { PasswordRequirementsChecklist } from './_share/password-requirements-checklist';
import { usePasswordStrength } from './_share/use-password-strength';

/** Delay before automatically redirecting to /auth/login after a successful reset. */
const SUCCESS_REDIRECT_DELAY_MS = 3000;

export function ResetPasswordForm() {
  const t = useTranslations('auth.resetPassword');
  const searchParams = useSearchParams();
  const defaultEmail = searchParams.get('email')?.trim() ?? '';

  const [email, setEmail] = useState(defaultEmail);
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();

  // Auto-redirect to login after a successful reset. Lives in an effect so the
  // timer is cleared if the user navigates away (e.g. clicks "Log in now")
  // before the delay elapses, instead of being scheduled inside the submit
  // handler where the timeout would leak past unmount.
  useEffect(() => {
    if (!success) return;
    const timer = window.setTimeout(() => {
      router.push('/auth/login');
    }, SUCCESS_REDIRECT_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [success, router]);

  const { requirements, isValid: isPasswordValid } = usePasswordStrength(
    password,
    confirmPassword,
  );

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setError(t('emailRequired'));
      return;
    }

    if (!otp.trim()) {
      setError(t('codeRequired'));
      return;
    }

    if (!isPasswordValid) {
      setError(t('passwordRequirementsNotMet'));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await authClient.emailOtp.resetPassword({
        email: email.trim(),
        otp: otp.trim(),
        password,
      });

      if (result?.error) {
        setError(t('invalidOrExpiredCode'));
      } else {
        setSuccess(true);
        // The auto-redirect to /auth/login is wired up in a useEffect that
        // watches `success`, so the timer is cleaned up on unmount.
      }
    } catch (errRes: unknown) {
      console.error('Reset password error:', errRes);
      setError(t('unexpectedError'));
    } finally {
      setIsLoading(false);
    }
  };

  // Success state
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
            <Link href="/auth/login">{t('loginNow')}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Lock className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {t('setNewPasswordTitle')}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t('setNewPasswordDescription')}
          {email && (
            <span className="block mt-1">
              {t('forEmailPrefix')}{' '}
              <span className="font-medium text-foreground">{email}</span>
            </span>
          )}
        </p>
      </div>

      <form onSubmit={handleResetPassword} className="space-y-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="email" className="block text-sm font-medium">
            {t('email')}
          </Label>
          <Input
            id="email"
            type="email"
            placeholder={t('emailPlaceholder')}
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 px-4"
          />
        </div>

        <div className="flex flex-col gap-3 py-1">
          <Label htmlFor="otp" className="sr-only">
            {t('otpCode')}
          </Label>
          <OtpInput6 id="otp" value={otp} onChange={setOtp} />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="password" className="block text-sm font-medium">
            {t('newPassword')}
          </Label>
          <PasswordInput
            id="password"
            placeholder={t('newPasswordPlaceholder')}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            showLabel={t('ariaShowPassword')}
            hideLabel={t('ariaHidePassword')}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label
            htmlFor="confirmPassword"
            className="block text-sm font-medium"
          >
            {t('confirmNewPassword')}
          </Label>
          <PasswordInput
            id="confirmPassword"
            placeholder={t('confirmNewPasswordPlaceholder')}
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            showLabel={t('ariaShowConfirmPassword')}
            hideLabel={t('ariaHideConfirmPassword')}
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
          disabled={isLoading || !isPasswordValid}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('updating')}
            </>
          ) : (
            t('resetPasswordButton')
          )}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        {t('rememberPassword')}{' '}
        <Link
          href="/auth/login"
          className="font-semibold text-link transition-colors hover:text-link/80"
        >
          {t('login')}
        </Link>
      </p>
      <p className="mt-2 text-center text-sm text-muted-foreground">
        <Link
          href="/auth/forgot-password"
          className="font-medium text-link transition-colors hover:text-link/80"
        >
          {t('requestNewCode')}
        </Link>
      </p>
    </div>
  );
}
