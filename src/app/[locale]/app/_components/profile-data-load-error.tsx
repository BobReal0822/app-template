'use client';

import { AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';

import { useAuth } from '@/contexts/auth-context';
import { useRouter } from '@/i18n/routing';

/**
 * Shown when the user has a valid session but profile/data loading
 * failed (e.g. transient Postgres / API errors). Avoids redirecting to
 * /auth/login, which would fight AuthRedirect and cause an /app ↔ /login loop.
 */
export function ProfileDataLoadError() {
  const t = useTranslations('appLayout.profileDataError');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const { signOut } = useAuth();

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 outline-none"
    >
      <div className="flex max-w-md flex-col items-center gap-3 text-center">
        <AlertTriangle className="h-12 w-12 text-amber-500" aria-hidden />
        <h1 className="text-lg font-semibold">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('description')}</p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button
          type="button"
          variant="default"
          onClick={() => router.refresh()}
        >
          {tCommon('retry')}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={async () => {
            await signOut();
            router.push('/auth/login');
          }}
        >
          {t('signOut')}
        </Button>
      </div>
    </main>
  );
}
