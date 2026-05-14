'use client';

import { Globe, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AnimatedSection } from '@/components/ui/animated-section';

const ABOUT_VALUES = [
  {
    icon: Users,
    titleKey: 'valueCustomerTitle' as const,
    descKey: 'valueCustomerDescription' as const,
  },
  {
    icon: Sparkles,
    titleKey: 'valueAIDrivenTitle' as const,
    descKey: 'valueAIDrivenDescription' as const,
  },
  {
    icon: ShieldCheck,
    titleKey: 'valueQualityTitle' as const,
    descKey: 'valueQualityDescription' as const,
  },
  {
    icon: Globe,
    titleKey: 'valueGlobalTitle' as const,
    descKey: 'valueGlobalDescription' as const,
  },
];

export function AboutValuesSection() {
  const t = useTranslations('about');

  return (
    <section className="bg-muted/40 py-20 sm:py-28">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <AnimatedSection animation="fadeUp" delay={0}>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
              {t('valuesSectionTitle')}
            </h2>
            <p className="about-cjk-section-subtitle text-lg text-muted-foreground">
              {t('valuesSectionSubtitle')}
            </p>
          </div>
        </AnimatedSection>

        <div className="mx-auto mt-16 grid max-w-5xl gap-6 sm:grid-cols-2">
          {ABOUT_VALUES.map((value, index) => (
            <AnimatedSection
              key={value.titleKey}
              animation="fadeUp"
              delay={index * 100}
            >
              <div className="group relative h-full overflow-hidden rounded-2xl bg-card p-8 shadow-sm shadow-foreground/5 transition-shadow duration-300 hover:shadow-xl dark:shadow-black/25 dark:hover:shadow-black/40">
                <div className="absolute inset-0 bg-primary/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <div className="relative flex gap-5">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary shadow-md shadow-primary/15">
                    <value.icon className="h-7 w-7 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground">
                      {t(value.titleKey)}
                    </h3>
                    <p className="mt-2 text-muted-foreground">
                      {t(value.descKey)}
                    </p>
                  </div>
                </div>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}
