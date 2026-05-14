'use client';

import { useTranslations } from 'next-intl';

import { AnimatedSection } from '@/components/ui/animated-section';
import { Button } from '@/components/ui/button';

import { LEGAL_CONFIG } from '@/config/legal';
import { Link } from '@/i18n/routing';
import { buildMailtoHref } from '@/lib/utils';

export function CtaSection() {
  const t = useTranslations('home');
  const c = useTranslations('common');

  return (
    <section className="bg-muted/40 py-16 sm:py-24">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <AnimatedSection animation="fadeDown">
            <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              {c('getStarted')}
            </p>
          </AnimatedSection>

          <AnimatedSection animation="fadeUp" delay={100}>
            <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {t('howToUse.readyToCreate')}
            </h2>
          </AnimatedSection>

          <AnimatedSection animation="fadeUp" delay={200}>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              {t('howToUse.startGenerating')}
            </p>
          </AnimatedSection>

          <AnimatedSection animation="fadeUp" delay={300}>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button
                size="lg"
                className="h-12 rounded-full px-8 transition-[scale] hover:scale-105"
                asChild
              >
                <Link href="/auth/sign-up">{c('getStarted')}</Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-12 rounded-full px-8 bg-transparent transition-[scale] hover:scale-105"
                asChild
              >
                <a href={buildMailtoHref(LEGAL_CONFIG.companyEmail)}>
                  {t('cta.contactUs')}
                </a>
              </Button>
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}
