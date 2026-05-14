import { routing } from '@/i18n/routing';
import { getSiteOrigin } from '@/lib/site-url';

import type { Metadata } from 'next';

export const MARKETING_OG_IMAGE_KEYS = [
  'home',
  'pricing',
  'about',
  'terms',
  'privacy',
] as const;

export type MarketingOgImageKey = (typeof MARKETING_OG_IMAGE_KEYS)[number];

// Suggested layout if you re-add the build-time OG generator (the old
// `scripts/build-og-images.ts` was dropped from the template — see
// `docs/optional-modules/og-image-generation.md` for how to wire it back).
// Output should live under `public/share/og/<key>-v2.png` (gitignored).
const MARKETING_OG_IMAGE_PATHS: Record<MarketingOgImageKey, string> = {
  home: '/share/og/home-v2.png',
  pricing: '/share/og/pricing-v2.png',
  about: '/share/og/about-v2.png',
  terms: '/share/og/terms-v2.png',
  privacy: '/share/og/privacy-v2.png',
};

/** Static path to the build-time pre-rendered OG image for a marketing page. */
export function getMarketingOgImagePath(key: MarketingOgImageKey): string {
  return MARKETING_OG_IMAGE_PATHS[key];
}

/**
 * Marketing pathname without locale (canonical href path) → OG image key.
 * Keeps `sitemap.ts` image URLs aligned with `getMarketingOgImagePath`.
 */
export const MARKETING_PATH_TO_OG_KEY = {
  '': 'home',
  '/about': 'about',
  '/terms': 'terms',
  '/privacy': 'privacy',
  '/pricing': 'pricing',
} as const satisfies Record<string, MarketingOgImageKey>;

function withLocalePrefix(locale: string, path: string): string {
  return locale === routing.defaultLocale ? path : `/${locale}${path}`;
}

function absoluteUrl(path: string): string {
  return `${getSiteOrigin()}${path}`;
}

type BuildMarketingMetadataParams = {
  locale: string;
  path: string;
  title: string;
  description: string;
  keywords?: string;
  ogImage?: string;
  ogImageAlt?: string;
};

export function buildMarketingPageMetadata({
  locale,
  path,
  title,
  description,
  keywords,
  ogImage = '/share/og/default.jpg',
  ogImageAlt = title,
}: BuildMarketingMetadataParams): Metadata {
  const normalizedPath = path === '' ? '/' : path;
  const canonicalPath =
    locale === routing.defaultLocale && path === ''
      ? '/'
      : withLocalePrefix(locale, path);
  const pageUrl = absoluteUrl(canonicalPath);

  return {
    title,
    description,
    ...(keywords ? { keywords } : {}),
    alternates: {
      canonical: canonicalPath,
      languages: {
        en: normalizedPath,
        zh: path === '' ? '/zh' : `/zh${path}`,
        'x-default': normalizedPath,
      },
    },
    openGraph: {
      title,
      description,
      url: pageUrl,
      type: 'website',
      siteName: 'App Template',
      locale: locale.toLowerCase().startsWith('zh') ? 'zh_CN' : 'en_US',
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
    robots: {
      index: true,
      follow: true,
    },
  };
}

type BuildWebPageJsonLdParams = {
  locale: string;
  path: string;
  title: string;
  description: string;
};

export function buildWebPageJsonLd({
  locale,
  path,
  title,
  description,
}: BuildWebPageJsonLdParams) {
  const localizedPath = withLocalePrefix(locale, path);

  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: title,
    description,
    url: absoluteUrl(localizedPath),
    inLanguage: locale === 'zh' ? 'zh-CN' : 'en-US',
    isPartOf: {
      '@type': 'WebSite',
      name: 'App Template',
      url: getSiteOrigin(),
    },
  };
}

export type FaqItem = { question: string; answer: string };

export function buildFaqJsonLd(items: FaqItem[]) {
  if (items.length === 0) {
    return null;
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}
