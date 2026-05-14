import { getSiteOrigin } from '@/lib/site-url';

export type LegalMarketingSegment = 'terms' | 'privacy';

export function legalMarketingAbsoluteUrl(
  locale: string,
  segment: LegalMarketingSegment,
  siteOrigin?: string,
): string {
  const path = locale === 'en' ? `/${segment}` : `/${locale}/${segment}`;
  return `${siteOrigin ?? getSiteOrigin()}${path}`;
}

export function legalMarketingWebPageJsonLd(options: {
  name: string;
  description: string;
  segment: LegalMarketingSegment;
  locale: string;
}): Record<string, unknown> {
  const { name, description, segment, locale } = options;
  const origin = getSiteOrigin();
  const url = legalMarketingAbsoluteUrl(locale, segment, origin);

  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name,
    url,
    description,
    isPartOf: {
      '@type': 'WebSite',
      name: 'App Template',
      url: origin,
    },
    publisher: {
      '@type': 'Organization',
      name: 'App Template',
      url: origin,
      logo: {
        '@type': 'ImageObject',
        url: `${origin}/logo/logo-light-v3.png`,
      },
    },
  };
}
