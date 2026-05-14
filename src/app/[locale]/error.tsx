'use client';

import { useEffect, useState, useRef } from 'react';

import { AlertCircle, Home, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';

import { useRouter } from '@/i18n/routing';

type Props = {
  error: Error & { digest?: string };
  reset(): void;
};

/** App Router `error.tsx` boundary for this locale segment (`reset` re-renders children). */
export default function Error({ error, reset }: Props) {
  const t = useTranslations('errorBoundary');
  const router = useRouter();
  const [isResetting, setIsResetting] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    console.error('Error boundary caught:', {
      message: error.message,
      stack: error.stack,
      digest: error.digest,
    });
  }, [error]);

  useEffect(
    () => () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    },
    [],
  );

  const handleReset = () => {
    setIsResetting(true);
    try {
      reset();
    } catch (resetError) {
      console.error('Failed to reset error boundary:', resetError);
      router.push('/');
    } finally {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        setIsResetting(false);
        timeoutRef.current = null;
      }, 1000);
    }
  };

  const isLikelyTemporaryError =
    error.message.includes('fetch') ||
    error.message.includes('network') ||
    error.message.includes('timeout') ||
    error.message.includes('ECONNREFUSED') ||
    error.message.includes('Failed to fetch');

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4 py-16 outline-none sm:px-6"
    >
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden
      >
        <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-destructive/10 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-muted/40 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      <div className="relative z-10 flex max-w-md flex-col items-center text-center">
        <div className="mb-8">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-12 w-12 text-destructive" aria-hidden />
          </div>
        </div>

        <h1 className="mb-3 text-2xl font-bold text-foreground">
          {t('title')}
        </h1>
        <p className="mb-6 text-muted-foreground">
          {isLikelyTemporaryError ? t('temporaryHint') : t('persistentHint')}
        </p>

        {process.env.NODE_ENV === 'development' && (
          <details className="mb-8 w-full max-w-md rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-left">
            <summary className="cursor-pointer text-sm font-medium text-destructive">
              {t('devDetailsLabel')}
            </summary>
            <pre className="mt-2 max-h-48 overflow-auto text-xs text-muted-foreground">
              {error.message}
              {error.stack && `\n\n${error.stack}`}
            </pre>
          </details>
        )}

        <div className="flex w-full max-w-sm flex-col gap-3 sm:flex-row sm:justify-center">
          {isLikelyTemporaryError && (
            <Button
              variant="outline"
              className="h-12 min-h-11 gap-2 rounded-xl px-6"
              onClick={handleReset}
              disabled={isResetting}
              type="button"
            >
              <RefreshCw
                className={`h-4 w-4 shrink-0 ${isResetting ? 'motion-safe:animate-spin' : ''}`}
                aria-hidden
              />
              {isResetting ? t('resetting') : t('tryAgain')}
            </Button>
          )}
          <Button
            className="h-12 min-h-11 gap-2 rounded-xl px-6"
            onClick={() => router.push('/')}
            type="button"
          >
            <Home className="h-4 w-4 shrink-0" aria-hidden />
            {t('goHome')}
          </Button>
        </div>
      </div>
    </main>
  );
}
