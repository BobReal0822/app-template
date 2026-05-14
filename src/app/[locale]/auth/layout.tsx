import type React from 'react';

import { getTranslations } from 'next-intl/server';

import { BrandLogo } from '@/components/brand/brand-logo';

import type { Locale } from '@/i18n/routing';
import { getCurrentYear } from '@/lib/utils/time';

import { AuthRedirect } from './_components/auth-redirect';
import { AuthShowcasePanel } from './_components/auth-showcase-panel';


export default async function AuthLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: 'auth.layout' });

  return (
    <AuthRedirect>
      <div className="flex min-h-screen">
        <AuthShowcasePanel />

        <div className="flex w-full flex-col lg:w-1/2">
          <header className="flex items-center px-6 pt-8 pb-4 lg:px-12">
            <BrandLogo height={28} />
          </header>

          {/* Form container */}
          <main
            id="main-content"
            tabIndex={-1}
            className="flex flex-1 items-center justify-center p-6 outline-none lg:p-12"
          >
            {children}
          </main>

          {/* Footer */}
          <footer className="px-6 pt-8 pb-6 text-center text-xs text-muted-foreground lg:px-12">
            {t('copyright', { year: getCurrentYear() })}
          </footer>
        </div>
      </div>
    </AuthRedirect>
  );
}
