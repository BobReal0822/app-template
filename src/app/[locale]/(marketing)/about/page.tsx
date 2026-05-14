import { getTranslations } from 'next-intl/server';

import { routing, type Locale } from '@/i18n/routing';
import { getSiteOrigin } from '@/lib/site-url';

import { getMarketingOgImagePath } from '../_shared/seo';

import { AboutPageContent } from './_components/page-content';

import type { Metadata } from 'next';

export const dynamic = 'auto';

function aboutPageAbsoluteUrl(locale: string): string {
  const origin = getSiteOrigin();
  return locale === 'en' ? `${origin}/about` : `${origin}/${locale}/about`;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: 'about' });

  const title = t('title');
  const description = t('description');
  const keywords = t('keywords');
  const url = aboutPageAbsoluteUrl(locale);
  const ogImageAlt = t('ogImageAlt1');
  const ogImage = getMarketingOgImagePath('about');

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical: locale === 'en' ? '/about' : `/${locale}/about`,
      languages: {
        en: '/about',
        zh: '/zh/about',
        'x-default': '/about',
      },
    },
    openGraph: {
      title,
      description,
      url,
      type: 'website',
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: ogImageAlt,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: ogImageAlt,
        },
      ],
    },
  };
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: 'about' });

  const siteOrigin = getSiteOrigin();
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: t('aboutTeno'),
    url: aboutPageAbsoluteUrl(locale),
    inLanguage: locale === 'zh' ? 'zh-CN' : 'en',
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
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <AboutPageContent />
    </>
  );
}
