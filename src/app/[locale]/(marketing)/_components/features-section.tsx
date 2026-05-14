'use client';

import { type LucideIcon, Layers } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

import { DarkImageOverlay } from '@/components/dark-image-overlay';
import { AnimatedSection } from '@/components/ui/animated-section';
import { Button } from '@/components/ui/button';
import { StaggerChildren } from '@/components/ui/stagger-children';

import { getFeatureById, type FeatureId } from '@/config/features';
import { Link } from '@/i18n/routing';

interface MarketingFeatureItem {
  id?: FeatureId;
  icon: LucideIcon;
  key:
    | 'urlToVideo'
    | 'videoAnalysis'
    | 'productVideo'
    | 'productPhoto'
    | 'assetGenerator';
  href: string;
  image: string;
}

interface FeatureCardProps {
  feature: MarketingFeatureItem;
  aspectClassName: 'aspect-video' | 'aspect-4/3';
  imageSizes: string;
  descriptionMinHeightClassName?: 'min-h-12' | 'min-h-14' | 'min-h-16';
}

const featureKeys: MarketingFeatureItem[] = [
  {
    id: 'urlToVideo',
    icon: getFeatureById('urlToVideo').icon,
    key: 'urlToVideo',
    href: '/features/url-to-video',
    image: '/images/features/url-to-video-v0.png',
  },
  {
    id: 'videoAnalysis',
    icon: getFeatureById('videoAnalysis').icon,
    key: 'videoAnalysis',
    href: '/features/video-insight',
    image: '/images/features/video-insight-v2.webp',
  },
  {
    id: 'productVideo',
    icon: getFeatureById('productVideo').icon,
    key: 'productVideo',
    href: '/features/product-video',
    image: '/images/features/product-video-v1.png',
  },
  {
    id: 'productPhoto',
    icon: getFeatureById('productPhoto').icon,
    key: 'productPhoto',
    href: '/features/product-photo',
    image: '/images/features/product-photo-v1.png',
  },
  {
    icon: Layers,
    key: 'assetGenerator',
    href: '#features',
    image: '/images/features/image-generator-v0.png',
  },
];

function FeatureCard({
  feature,
  aspectClassName,
  imageSizes,
  descriptionMinHeightClassName,
}: FeatureCardProps) {
  const t = useTranslations('home.features');
  const tFeatureNames = useTranslations('featureNames');
  const title = feature.id
    ? tFeatureNames(feature.id)
    : t(`${feature.key}.title`);

  return (
    <Link
      href={feature.href}
      className="group flex h-full flex-col overflow-hidden rounded-2xl bg-card shadow-sm shadow-black/5 transition-[translate,box-shadow] duration-200 ease-[cubic-bezier(.22,1,.36,1)] hover:-translate-y-0.5 hover:shadow-md dark:shadow-black/30 dark:hover:shadow-black/40"
    >
      <div className={`relative overflow-hidden bg-muted ${aspectClassName}`}>
        <Image
          src={feature.image}
          alt={title}
          fill
          sizes={imageSizes}
          className="object-cover transition-[scale] duration-200 ease-[cubic-bezier(.22,1,.36,1)] group-hover:scale-[1.02]"
        />
        <DarkImageOverlay />
      </div>
      <div className="flex flex-1 flex-col p-6">
        <div className="mb-3 flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <feature.icon className="h-4 w-4" />
          </div>
          <h3 className="text-base font-semibold leading-tight text-foreground transition-colors duration-300 group-hover:text-primary">
            {title}
          </h3>
        </div>
        <p
          className={`text-sm leading-relaxed text-muted-foreground line-clamp-2 ${descriptionMinHeightClassName ?? ''}`}
        >
          {t(`${feature.key}.description`)}
        </p>
      </div>
    </Link>
  );
}

export function FeaturesSection() {
  const t = useTranslations('home.features');

  return (
    <section id="features" className="bg-background py-16 sm:py-24">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <AnimatedSection animation="fadeUp">
          <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
            <div className="max-w-2xl">
              <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                {t('label')}
              </p>
              <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                {t('descriptionLine1')} <br className="hidden sm:block" />
                {t('descriptionLine2')}
              </h2>
            </div>
            <Button
              variant="outline"
              className="rounded-full bg-transparent transition-[scale] duration-300 ease-out hover:scale-105"
              asChild
            >
              <Link href="/auth/sign-up">{t('getStarted')}</Link>
            </Button>
          </div>
        </AnimatedSection>

        {/* Top row: 2 hero feature cards */}
        <StaggerChildren
          className="mt-12 grid gap-6 lg:gap-7 md:grid-cols-2"
          staggerDelay={100}
          animation="scaleUp"
        >
          {featureKeys.slice(0, 2).map((feature) => (
            <FeatureCard
              key={feature.key}
              feature={feature}
              aspectClassName="aspect-video"
              imageSizes="(max-width: 768px) 100vw, 50vw"
            />
          ))}
        </StaggerChildren>

        {/* Bottom row: 3 feature cards */}
        <StaggerChildren
          className="mt-7 grid gap-6 lg:gap-7 sm:grid-cols-2 lg:grid-cols-3"
          staggerDelay={100}
          animation="scaleUp"
        >
          {featureKeys.slice(2).map((feature) => (
            <FeatureCard
              key={feature.key}
              feature={feature}
              aspectClassName="aspect-4/3"
              imageSizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              descriptionMinHeightClassName="min-h-14"
            />
          ))}
        </StaggerChildren>
      </div>
    </section>
  );
}
