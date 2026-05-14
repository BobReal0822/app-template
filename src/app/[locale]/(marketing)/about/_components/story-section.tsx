'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';

import { DarkImageOverlay } from '@/components/dark-image-overlay';
import { AnimatedSection } from '@/components/ui/animated-section';

export function AboutStorySection() {
  const t = useTranslations('about');

  return (
    <section className="bg-background py-20 sm:py-28">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <AnimatedSection animation="fadeRight" delay={0}>
            <div className="relative">
              <div className="absolute -left-4 -top-4 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
              <div className="relative overflow-hidden rounded-3xl shadow-2xl shadow-foreground/10 dark:shadow-black/45">
                <Image
                  src="/images/about-team-v3.webp"
                  alt={t('storyImageAlt')}
                  width={800}
                  height={600}
                  className="w-full object-cover"
                />
                <DarkImageOverlay />
              </div>
            </div>
          </AnimatedSection>

          <AnimatedSection animation="fadeLeft" delay={100}>
            <div>
              <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
                {t('storyTitle')}
              </h2>
              <div className="mt-6 space-y-4 text-muted-foreground">
                <p>{t('storyP1')}</p>
                <p>{t('storyP2')}</p>
                <p>{t('storyP3')}</p>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}
