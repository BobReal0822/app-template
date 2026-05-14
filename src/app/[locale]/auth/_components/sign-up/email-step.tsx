'use client';

import { type FormEvent, useEffect, useRef } from 'react';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { FeedbackAlert } from '@/components/app/feedback-alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

import { GoogleOAuthButton } from '../google-oauth-button';

interface EmailStepProps {
  email: string;
  error: string | null;
  isSubmitting: boolean;
  isGoogleLoading: boolean;
  isAnyLoading: boolean;
  onEmailChange: (value: string) => void;
  onGoogleLogin: () => void;
  onSubmit: () => void;
}

export function EmailStep({
  email,
  error,
  isSubmitting,
  isGoogleLoading,
  isAnyLoading,
  onEmailChange,
  onGoogleLogin,
  onSubmit,
}: EmailStepProps) {
  const t = useTranslations('auth.signup');
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus the email field when this step mounts so users can start typing
  // immediately on page load and after navigating back from OTP.
  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <>
      <GoogleOAuthButton
        onClick={onGoogleLogin}
        loading={isGoogleLoading}
        disabled={isAnyLoading && !isGoogleLoading}
        label={t('continueWithGoogle')}
      />
      <div className="relative my-6">
        <Separator />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-3 text-xs text-muted-foreground">
          {t('orContinueWithEmail')}
        </span>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="email" className="block text-sm font-medium">
            {t('email')}
          </Label>
          <Input
            ref={inputRef}
            id="email"
            name="email"
            type="email"
            placeholder={t('emailPlaceholder')}
            required
            autoComplete="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            className="h-11 px-4"
          />
        </div>
        {error && <FeedbackAlert description={error} />}
        <Button
          type="submit"
          className="h-11 w-full font-medium"
          disabled={isAnyLoading}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('sendingOtp')}
            </>
          ) : (
            t('sendOtp')
          )}
        </Button>
      </form>
    </>
  );
}
