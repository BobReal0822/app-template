'use client';

import { type FormEvent, useEffect, useRef } from 'react';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { FeedbackAlert } from '@/components/app/feedback-alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface EmailStepProps {
  email: string;
  error: string | null;
  isSubmitting: boolean;
  isAnyLoading: boolean;
  onEmailChange: (value: string) => void;
  onSubmit: () => void;
}

export function EmailStep({
  email,
  error,
  isSubmitting,
  isAnyLoading,
  onEmailChange,
  onSubmit,
}: EmailStepProps) {
  const t = useTranslations('auth.forgotPassword');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email" className="block text-sm font-medium">
          {t('emailAddress')}
        </Label>
        <Input
          ref={inputRef}
          id="email"
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
            {t('sendingResetEmail')}
          </>
        ) : (
          t('sendResetCode')
        )}
      </Button>
    </form>
  );
}
