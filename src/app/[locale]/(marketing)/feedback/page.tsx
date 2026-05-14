import { getTranslations } from 'next-intl/server';

import { routing, type Locale } from '@/i18n/routing';
import { getSiteOrigin } from '@/lib/site-url';

import { FeedbackForm } from './feedback-form';

import type { Metadata } from 'next';

export const dynamic = 'auto';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const translator = await getTranslations({ locale: locale as Locale, namespace: 'feedback',
  }).catch(() => null);

  const title = translator ? translator('title') : 'feedback.title';
  const description = translator
    ? translator('description')
    : 'feedback.description';
  const keywords = translator ? translator('keywords') : 'feedback.keywords';

  const siteOrigin = getSiteOrigin();
  const url =
    locale === 'en'
      ? `${siteOrigin}/feedback`
      : `${siteOrigin}/${locale}/feedback`;

  return {
    title,
    description,
    keywords,
    robots: {
      index: false,
      follow: true,
      noarchive: true,
      nosnippet: false,
    },
    alternates: {
      canonical: locale === 'en' ? '/feedback' : `/${locale}/feedback`,
      languages: {
        en: '/feedback',
        zh: '/zh/feedback',
        'x-default': '/feedback',
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
          alt: 'App Template - Feedback',
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
          alt: 'App Template - Feedback',
        },
      ],
    },
  };
}

export default async function FeedbackPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await props.params;
  const locale = localeParam || 'en';
  const t = await getTranslations({ locale: locale as Locale, namespace: 'feedback' });
  const siteOrigin = getSiteOrigin();
  const feedbackUrl =
    locale === 'en'
      ? `${siteOrigin}/feedback`
      : `${siteOrigin}/${locale}/feedback`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FeedbackPage',
    name: t('title'),
    url: feedbackUrl,
    description: t('description'),
    publisher: {
      '@type': 'Organization',
      name: 'App Template',
      url: siteOrigin,
      logo: {
        '@type': 'ImageObject',
        url: `${siteOrigin}/logo/logo-light-v3.png`,
      },
    },
  };

  return (
    <section className="border-t border-border/60 bg-linear-to-b from-muted/35 via-background to-background dark:from-muted/25">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="py-12 md:py-16">
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
          <div className="mb-8 max-w-3xl md:mb-12">
            <h1 className="mb-3 text-2xl font-bold tracking-tight md:text-3xl">
              {t('mainTitle')}
            </h1>
            <p className="text-sm leading-6 text-muted-foreground md:text-base md:leading-7">
              {t('mainDescription')}
            </p>
          </div>
          <FeedbackForm locale={locale} />
        </div>
      </div>
    </section>
  );
}
