'use client';

import { Video, Home, ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';

import { Link } from '@/i18n/routing';

export default function AppNotFound() {
  const t = useTranslations('appNotFound');

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4">
      {/* Icon */}
      <div className="relative mb-8">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-linear-to-br from-primary/20 to-chart-4/20">
          <Video className="h-12 w-12 text-primary" />
        </div>
        <div className="absolute -right-2 -top-2 flex h-10 w-10 items-center justify-center rounded-full bg-muted text-lg font-bold text-muted-foreground">
          ?
        </div>
      </div>

      {/* Text */}
      <h1 className="mb-3 text-2xl font-bold text-foreground">{t('title')}</h1>
      <p className="mb-8 max-w-md text-center text-muted-foreground">
        {t('description')}
      </p>

      {/* Actions */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          variant="outline"
          className="gap-2 rounded-xl bg-transparent"
          onClick={() => window.history.back()}
        >
          <ArrowLeft className="h-4 w-4" />
          {t('actions.goBack')}
        </Button>
        <Button
          className="gap-2 rounded-xl bg-linear-to-r from-primary to-chart-4"
          asChild
        >
          <Link href="/app">
            <Home className="h-4 w-4" />
            {t('actions.backToDashboard')}
          </Link>
        </Button>
      </div>
    </div>
  );
}
