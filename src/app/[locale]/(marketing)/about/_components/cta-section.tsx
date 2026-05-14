'use client';

import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AnimatedSection } from '@/components/ui/animated-section';
import { Button } from '@/components/ui/button';

import { Link } from '@/i18n/routing';

export function AboutCtaSection() {
  const t = useTranslations('about');

  return (
    <section className="bg-background py-20 sm:py-28">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <AnimatedSection animation="fadeUp" delay={0}>
          <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-primary px-6 py-16 sm:px-16 sm:py-20">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--primary-foreground)/0.12)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--primary-foreground)/0.12)_1px,transparent_1px)] bg-size-[14px_24px]" />

            <div className="relative mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold text-primary-foreground sm:text-4xl">
                {t('ctaTitle')}
              </h2>
              <p className="about-cjk-section-subtitle text-lg text-primary-foreground/80">
                {t('ctaSubtitle')}
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Button
                  size="lg"
                  className="h-12 cursor-pointer rounded-full bg-primary-foreground px-8 text-primary hover:bg-primary-foreground/90"
                  asChild
                >
                  <Link href="/auth/sign-up">
                    {t('ctaPrimary')}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 cursor-pointer rounded-full border-primary-foreground/30 bg-transparent px-8 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
                  asChild
                >
                  <Link href="/pricing">{t('ctaSecondary')}</Link>
                </Button>
              </div>
            </div>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
