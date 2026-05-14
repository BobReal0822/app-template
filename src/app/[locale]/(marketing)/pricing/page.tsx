import { getTranslations } from 'next-intl/server';

import {
  buildMarketingPageMetadata,
  getMarketingOgImagePath,
} from '../_shared/seo';

import { PricingPageContent } from './pricing-page-content';

import type { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'pricingPage' });

  return buildMarketingPageMetadata({
    locale,
    path: '/pricing',
    title: t('meta.title'),
    description: t('meta.description'),
    ogImage: getMarketingOgImagePath('pricing'),
    ogImageAlt: t('meta.title'),
  });
}

export default function PricingPage() {
  return <PricingPageContent />;
}
