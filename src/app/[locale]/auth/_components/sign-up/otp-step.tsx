'use client';

import {
  type ComponentRef,
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from 'react';

import { ChevronLeft, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { FeedbackAlert } from '@/components/app/feedback-alert';
import { Button } from '@/components/ui/button';
import { InputOTP } from '@/components/ui/input-otp';
import { Label } from '@/components/ui/label';

import { Link } from '@/i18n/routing';

import { OtpInput6 } from '../_share/otp-input-6';

interface OtpStepProps {
  otp: string;
  error: string | null;
  isVerifying: boolean;
  isResending: boolean;
  isAnyLoading: boolean;
  cooldownUntil: number | null;
  onOtpChange: (value: string) => void;
  onResendOtp: () => void;
  onBackToEmail: () => void;
  /**
   * Called when the user explicitly submits or auto-submit triggers on the
   * 6th digit. The optional `codeOverride` lets us pass the freshly-typed
   * value through without waiting for the parent reducer to commit (the
   * parent's closure would otherwise still see the 5-digit OTP).
   */
  onSubmit: (codeOverride?: string) => void;
}

export function OtpStep({
  otp,
  error,
  isVerifying,
  isResending,
  isAnyLoading,
  cooldownUntil,
  onOtpChange,
  onResendOtp,
  onBackToEmail,
  onSubmit,
}: OtpStepProps) {
  const t = useTranslations('auth.signup');
  const otpInputRef = useRef<ComponentRef<typeof InputOTP>>(null);
  const isComplete = otp.trim().length === 6;
  const [cooldownLeftSec, setCooldownLeftSec] = useState(0);
  const isExistingAccountError = error === t('accountExists');

  useEffect(() => {
    otpInputRef.current?.focus();
  }, []);

  useEffect(() => {
    const getRemainingSeconds = () => {
      if (typeof cooldownUntil !== 'number') return 0;
      return Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
    };

    setCooldownLeftSec(getRemainingSeconds());
    if (typeof cooldownUntil !== 'number') return;

    const timer = window.setInterval(() => {
      const remaining = getRemainingSeconds();
      setCooldownLeftSec(remaining);
      if (remaining <= 0) {
        window.clearInterval(timer);
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldownUntil]);

  // Auto-submit as soon as the user completes 6 digits — pasting a code or
  // typing the last digit shouldn't require an extra button press. We pass
  // `next` through so the flow hook verifies the just-typed value instead of
  // its closed-over (5-digit) state. The hook itself still guards against
  // re-entry while a request is in flight.
  const handleOtpChange = (next: string) => {
    onOtpChange(next);
    if (next.length === 6 && !isAnyLoading) {
      onSubmit(next);
    }
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-col gap-3 py-1">
        <Label htmlFor="otp" className="sr-only">
          {t('otpCode')}
        </Label>
        <OtpInput6
          ref={otpInputRef}
          id="otp"
          value={otp}
          onChange={handleOtpChange}
        />
      </div>
      {error && <FeedbackAlert description={error} />}
      {isExistingAccountError && (
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" className="h-10" asChild>
            <Link href="/auth/login">{t('login')}</Link>
          </Button>
          <Button type="button" variant="secondary" className="h-10" asChild>
            <Link href="/auth/forgot-password">{t('forgotPasswordCta')}</Link>
          </Button>
        </div>
      )}
      <Button
        type="submit"
        className="h-11 w-full font-medium"
        disabled={isAnyLoading || !isComplete}
      >
        {isVerifying ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t('verifyingOtp')}
          </>
        ) : (
          t('verifyOtp')
        )}
      </Button>
      <Button
        type="button"
        variant="outline"
        className="h-11 w-full font-medium"
        disabled={isAnyLoading || cooldownLeftSec > 0}
        onClick={onResendOtp}
      >
        {isResending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t('sendingOtp')}
          </>
        ) : cooldownLeftSec > 0 ? (
          t('resendOtpIn', { seconds: cooldownLeftSec })
        ) : (
          t('resendOtp')
        )}
      </Button>
      <Button
        type="button"
        variant="ghost"
        className="h-9 w-full text-sm text-muted-foreground transition-colors hover:text-foreground"
        disabled={isAnyLoading}
        onClick={onBackToEmail}
      >
        <ChevronLeft className="mr-1 h-4 w-4" />
        {t('editEmail')}
      </Button>
    </form>
  );
}
