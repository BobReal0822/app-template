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

import { OtpInput6 } from '../_share/otp-input-6';

interface OtpStepProps {
  otp: string;
  error: string | null;
  isVerifying: boolean;
  isResending: boolean;
  isAnyLoading: boolean;
  cooldownUntil: number | null;
  onOtpChange: (value: string) => void;
  onResendCode: () => void;
  onBackToEmail: () => void;
  /**
   * Called on primary action or when the 6th digit is filled (including paste).
   * `codeOverride` passes the fresh value so the parent does not read a stale
   * 5-digit `otp` from its closure in the same event tick.
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
  onResendCode,
  onBackToEmail,
  onSubmit,
}: OtpStepProps) {
  const t = useTranslations('auth.forgotPassword');
  const otpInputRef = useRef<ComponentRef<typeof InputOTP>>(null);
  const [cooldownLeftSec, setCooldownLeftSec] = useState(0);
  const isComplete = otp.trim().length === 6;

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

      <Button
        type="submit"
        className="h-11 w-full font-medium"
        disabled={isAnyLoading || !isComplete}
      >
        {isVerifying ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t('verifyingCode')}
          </>
        ) : (
          t('continueToPassword')
        )}
      </Button>

      <Button
        type="button"
        variant="outline"
        className="h-11 w-full font-medium"
        disabled={isAnyLoading || cooldownLeftSec > 0}
        onClick={onResendCode}
      >
        {isResending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t('sendingResetEmail')}
          </>
        ) : cooldownLeftSec > 0 ? (
          t('resendCodeIn', { seconds: cooldownLeftSec })
        ) : (
          t('requestNewCode')
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
