'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';

import { DarkImageOverlay } from '@/components/dark-image-overlay';
import { AnimatedSection } from '@/components/ui/animated-section';
import { Button } from '@/components/ui/button';
import { StaggerChildren } from '@/components/ui/stagger-children';

import { Link } from '@/i18n/routing';

export function BrandSection() {
  const t = useTranslations('home');
  const brandFeatures = [
    {
      title: t('brand.feature1Title'),
      description: t('brand.feature1Description'),
    },
    {
      title: t('brand.feature2Title'),
      description: t('brand.feature2Description'),
    },
    {
      title: t('brand.feature3Title'),
      description: t('brand.feature3Description'),
    },
  ];

  return (
    <section className="bg-muted/40 py-16 sm:py-24">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <AnimatedSection animation="fadeUp" className="text-center">
          <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {t('brand.title')}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            {t('brand.description')}
          </p>
        </AnimatedSection>

        {/* Brand Preview */}
        <AnimatedSection animation="scaleUp" delay={200}>
          <div className="mt-12 overflow-hidden rounded-2xl bg-card shadow-md shadow-black/5 transition-shadow duration-500 hover:shadow-xl dark:shadow-black/30 dark:hover:shadow-black/45">
            <div className="relative aspect-video overflow-hidden bg-muted">
              <Image
                src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&h=675&fit=crop&q=80"
                alt={t('brand.previewAlt')}
                fill
                sizes="(max-width: 768px) 100vw, 1200px"
                className="object-cover transition-[scale] duration-500 hover:scale-105"
              />
              <DarkImageOverlay />
            </div>
          </div>
        </AnimatedSection>

        {/* Feature Grid */}
        <StaggerChildren
          className="mt-12 grid gap-8 md:grid-cols-3"
          staggerDelay={150}
          animation="fadeUp"
        >
          {brandFeatures.map((feature) => (
            <div key={feature.title} className="group">
              <h3 className="text-lg font-semibold text-foreground">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {feature.description}
              </p>
              <Button
                variant="link"
                className="mt-3 h-auto p-0 text-primary transition-[translate] group-hover:translate-x-1"
                asChild
              >
                <Link href="#">{t('brand.exploreFeature')} →</Link>
              </Button>
            </div>
          ))}
        </StaggerChildren>
      </div>
    </section>
  );
}
