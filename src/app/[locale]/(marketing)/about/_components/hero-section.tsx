'use client';

import { useTranslations } from 'next-intl';

import { AnimatedSection } from '@/components/ui/animated-section';

export function AboutHeroSection() {
  const t = useTranslations('about');

  return (
    <section className="relative overflow-hidden bg-linear-to-b from-muted/35 via-background to-background pb-20 pt-16 sm:pb-28 sm:pt-24 dark:from-muted/20">
      {/* Soft spotlight — avoids a flat “washed” primary tint */}
      <div
        className="pointer-events-none absolute -top-24 left-1/2 h-[min(55vh,28rem)] w-[min(100%,42rem)] -translate-x-1/2 rounded-full bg-primary/6 blur-3xl dark:bg-primary/9"
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--foreground)/0.06)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--foreground)/0.06)_1px,transparent_1px)] bg-size-[14px_24px] mask-[radial-gradient(ellipse_60%_50%_at_50%_0%,black_70%,transparent_110%)]"
        aria-hidden
      />

      <div className="relative mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <AnimatedSection animation="fadeUp" delay={0}>
            <h1 className="about-cjk-hero-title text-balance bg-linear-to-br from-foreground via-foreground to-primary bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl lg:text-6xl">
              {t('heroTitle')}
            </h1>
          </AnimatedSection>

          <AnimatedSection animation="fadeUp" delay={100}>
            <p className="about-cjk-hero-subtitle text-pretty text-lg text-foreground/70 sm:text-xl dark:text-foreground/65">
              {t('heroSubtitle')}
            </p>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}
