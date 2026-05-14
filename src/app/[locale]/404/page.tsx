import { Home, ArrowLeft } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { Button } from '@/components/ui/button';

import { Link } from '@/i18n/routing';
import { getSiteOrigin } from '@/lib/site-url';

import type { Metadata } from 'next';

export const dynamic = 'force-static';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: 'en' | 'zh' }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale,
    namespace: 'notFound',
  });

  const title = t('title');
  const description = t('description');

  const siteOrigin = getSiteOrigin();
  const url =
    locale === 'en' ? `${siteOrigin}/404` : `${siteOrigin}/${locale}/404`;

  return {
    title,
    description,
    alternates: {
      canonical: locale === 'en' ? '/404' : `/${locale}/404`,
      languages: {
        en: '/404',
        zh: '/zh/404',
        'x-default': '/404',
      },
    },
    openGraph: {
      title,
      description,
      url,
      type: 'website',
      images: [
        {
          url: '/share/og/default.jpg',
          width: 1200,
          height: 630,
          alt: '404 - App Template, Create Professional AI Videos for Cross-Border E-Commerce',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [
        {
          url: '/share/og/default.jpg',
          width: 1200,
          height: 630,
          alt: '404 - App Template, Create Professional AI Videos for Cross-Border E-Commerce',
        },
      ],
    },
  };
}

export default async function NotFoundPage({
  params,
}: {
  params: Promise<{ locale: 'en' | 'zh' }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({
    locale,
    namespace: 'notFound',
  });
  const tNav = await getTranslations({
    locale,
    namespace: 'marketingNav',
  });
  const tFeatureNames = await getTranslations({
    locale,
    namespace: 'featureNames',
  });
  const tFooter = await getTranslations({
    locale,
    namespace: 'marketingFooter',
  });
  const tSite = await getTranslations({
    locale,
    namespace: 'footer',
  });

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4 pb-24 pt-16 outline-none sm:px-6"
    >
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden
      >
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-chart-4/10 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      <div className="relative z-10 max-w-xl text-center">
        <div className="mb-8">
          <p
            aria-hidden
            className="text-primary/90 font-bold leading-none tracking-tighter"
            style={{
              fontSize: 'clamp(5rem, 22vw, 13rem)',
            }}
          >
            404
          </p>
        </div>

        <div className="mx-auto max-w-lg space-y-4">
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
            {t('pageNotFound')}
          </h1>
          <p className="text-base text-muted-foreground sm:text-lg">
            {t('pageNotFoundDescription')}
          </p>
        </div>

        <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center sm:justify-center sm:gap-4">
          <Button
            size="lg"
            className="h-12 min-h-11 gap-2 rounded-xl px-8 text-base font-semibold shadow-lg shadow-primary/25 transition-[scale,box-shadow] motion-safe:hover:scale-[1.02] motion-safe:hover:shadow-xl motion-safe:hover:shadow-primary/30"
            asChild
          >
            <Link href="/" aria-label={t('ariaLabelBackToHome')}>
              <Home className="h-5 w-5 shrink-0" aria-hidden />
              {t('backToHome')}
            </Link>
          </Button>

          <Button
            size="lg"
            variant="outline"
            className="h-12 min-h-11 gap-2 rounded-xl border-border bg-transparent px-8 text-base font-medium transition-colors hover:bg-muted"
            asChild
          >
            <Link href="/app" aria-label={t('ariaLabelGoToDashboard')}>
              <ArrowLeft className="h-5 w-5 shrink-0" aria-hidden />
              {tNav('goToDashboard')}
            </Link>
          </Button>
        </div>

        <nav
          className="mt-16 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-muted-foreground"
          aria-labelledby="not-found-quick-label"
        >
          <span id="not-found-quick-label" className="text-muted-foreground">
            {t('quickLinks')}
          </span>
          <Link
            href="/features/url-to-video"
            className="inline-flex min-h-11 items-center rounded-md px-1 py-2 font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            {tFeatureNames('urlToVideo')}
          </Link>
          <Link
            href="/pricing"
            className="inline-flex min-h-11 items-center rounded-md px-1 py-2 font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            {tNav('pricing')}
          </Link>
          <Link
            href="/blog"
            className="inline-flex min-h-11 items-center rounded-md px-1 py-2 font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            {tFooter('links.blog')}
          </Link>
        </nav>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-xs text-muted-foreground/60">
        {tSite('title')}
      </div>
    </main>
  );
}
