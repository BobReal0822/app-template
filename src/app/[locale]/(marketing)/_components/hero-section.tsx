'use client';

import {
  Camera,
  Check,
  ImagePlus,
  Lightbulb,
  Video,
  type LucideIcon,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AnimatedSection } from '@/components/ui/animated-section';
import { Button } from '@/components/ui/button';

import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { Link } from '@/i18n/routing';
import { cn } from '@/lib/utils';

import { HeroPreview } from './hero-preview';

/** Bottom float: product photo, product video, video insight (see `hero.toolsLabel`). */
const HERO_TOOL_ICONS: readonly LucideIcon[] = [Camera, Video, Lightbulb];

export function HeroSection() {
  const t = useTranslations('home');
  const prefersReducedMotion = useReducedMotion();
  const heroFeatures = [t('hero.feature1'), t('hero.feature2')];

  return (
    <section className="relative overflow-hidden bg-linear-to-b from-primary/5 via-background to-background pb-20 pt-16 dark:from-primary/10 sm:pb-32 sm:pt-24">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <AnimatedSection animation="fadeDown" delay={0}>
            <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
              <span
                className={cn(
                  'flex h-2 w-2 shrink-0 rounded-full bg-primary',
                  !prefersReducedMotion && 'animate-pulse',
                )}
                aria-hidden
              />
              {t('badge')}
            </div>
          </AnimatedSection>

          <AnimatedSection animation="fadeUp" delay={100}>
            <h1 className="mx-auto max-w-4xl text-balance text-5xl font-bold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
              {t.rich('slogan', {
                ai: (chunks) => (
                  <span className="font-serif italic text-primary">
                    {chunks}
                  </span>
                ),
              })}
            </h1>
          </AnimatedSection>

          <AnimatedSection animation="fadeUp" delay={200}>
            <p className="mx-auto mt-8 max-w-2xl text-pretty text-lg text-muted-foreground sm:text-xl">
              {t('description')}
            </p>
          </AnimatedSection>

          <AnimatedSection animation="fadeUp" delay={300}>
            <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button
                size="lg"
                className="h-14 rounded-full px-10 text-lg font-semibold transition-[box-shadow,scale] duration-300 ease-out hover:scale-105 hover:shadow-lg hover:shadow-black/10"
                asChild
              >
                <Link href="/auth/sign-up">{t('hero.tryForFree')}</Link>
              </Button>
            </div>
          </AnimatedSection>

          <AnimatedSection animation="fadeIn" delay={400}>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-6">
              {heroFeatures.map((feature) => (
                <div
                  key={feature}
                  className="flex items-center gap-2 text-sm text-muted-foreground sm:text-base"
                >
                  <Check className="h-5 w-5 text-primary" />
                  {feature}
                </div>
              ))}
            </div>
          </AnimatedSection>
        </div>

        <AnimatedSection animation="scaleUp" delay={500} duration={800}>
          <div className="relative mt-16 sm:mt-20">
            <div className="relative mx-auto max-w-5xl">
              {/* Composed preview (`hero-preview`); outer radius matches BrowserFrame for shadow. */}
              <div className="relative aspect-16/10 rounded-2xl shadow-2xl shadow-black/8 transition-shadow duration-500 hover:shadow-primary/15 dark:shadow-black/35 dark:hover:shadow-black/50">
                <HeroPreview />
              </div>

              {/* Decorative (`aria-hidden`); same ideas are in copy + HeroPreview. */}
              <div aria-hidden className="pointer-events-none">
                <div className="absolute -left-4 top-1/3 hidden items-center gap-2.5 rounded-xl border border-border/40 bg-card px-3 py-2 shadow-md shadow-black/5 sm:flex lg:-left-24 animate-float dark:shadow-black/30">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <ImagePlus className="h-4 w-4" />
                  </div>
                  <p className="text-sm font-medium text-foreground whitespace-nowrap">
                    {t('hero.featureCardTitle')}
                  </p>
                </div>

                <div className="absolute -right-4 top-1/3 hidden items-center gap-2.5 rounded-xl border border-border/40 bg-card px-3 py-2 shadow-md shadow-black/5 sm:flex lg:-right-24 animate-float-delayed dark:shadow-black/30">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success/10 text-success">
                    <Check className="h-4 w-4" />
                  </div>
                  <p className="text-sm font-medium text-foreground whitespace-nowrap">
                    {t('hero.videoReady')}
                  </p>
                </div>

                <div className="absolute -bottom-4 left-1/4 hidden items-center gap-2.5 rounded-xl border border-border/40 bg-card px-3 py-2 shadow-md shadow-black/5 sm:flex animate-float dark:shadow-black/30">
                  <div className="flex -space-x-2">
                    {HERO_TOOL_ICONS.map((Icon, index) => (
                      <div
                        key={index}
                        className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-card bg-muted text-muted-foreground"
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                    ))}
                  </div>
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    {t('hero.toolsLabel')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
