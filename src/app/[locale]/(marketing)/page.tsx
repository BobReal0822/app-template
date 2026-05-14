// Temporary disable sections (LogoBar, TestimonialsSection, BrandSection, TrustSection) for MVP
// TODO: Enable sections after MVP, don't remove the comments below.

import { getTranslations, setRequestLocale } from 'next-intl/server';

import type { Locale } from '@/i18n/routing';

import { CtaSection } from './_components/cta-section';
import { FeaturesSection } from './_components/features-section';
import { HeroSection } from './_components/hero-section';
import {
  buildMarketingPageMetadata,
  getMarketingOgImagePath,
} from './_shared/seo';
// import { LogoBar } from './_components/logo-bar';
// import { TestimonialsSection } from './_components/testimonials-section';
// import { BrandSection } from './_components/brand-section';
// import { TrustSection } from './_components/trust-section';

import type { Metadata } from 'next';


export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: 'home' });

  return buildMarketingPageMetadata({
    locale,
    path: '',
    title: t('title'),
    description: t('description'),
    keywords: t('keywords'),
    ogImage: getMarketingOgImagePath('home'),
    ogImageAlt: t('title'),
  });
}

// Organization + WebSite JSON-LD live in `src/app/[locale]/layout.tsx` (site-wide).
export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  return (
    <>
      <HeroSection />
      {/* <LogoBar /> */}
      {/* <TestimonialsSection /> */}
      <FeaturesSection />
      {/* <BrandSection /> */}
      {/* <TrustSection /> */}
      <CtaSection />
    </>
  );
}
