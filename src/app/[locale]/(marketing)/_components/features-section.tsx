'use client';

import { useTranslations } from 'next-intl';

import { AnimatedSection } from '@/components/ui/animated-section';
import { Button } from '@/components/ui/button';

import { Link } from '@/i18n/routing';

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

        {/* Add your feature cards here */}
      </div>
    </section>
  );
}
