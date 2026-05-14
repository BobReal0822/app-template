'use client';

import { Eye, Globe, Target } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

import { AnimatedSection } from '@/components/ui/animated-section';

const MISSION_AVATARS = [
  '/avatar/avatar-4.webp',
  '/avatar/avatar-9.webp',
  '/avatar/avatar-7.webp',
];

export function AboutMissionVisionSection() {
  const t = useTranslations('about');

  return (
    <section className="bg-muted/40 py-20 sm:py-28">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <AnimatedSection animation="fadeUp" delay={0}>
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
              {t('whatWeStandForTitle')}
            </h2>
            <p className="about-cjk-section-subtitle text-lg text-muted-foreground">
              {t('whatWeStandForSubtitle')}
            </p>
          </div>
        </AnimatedSection>

        <div className="grid gap-8 lg:grid-cols-2">
          <AnimatedSection animation="fadeRight" delay={100} className="h-full">
            <div className="group relative h-full overflow-hidden rounded-3xl bg-card p-1 shadow-sm shadow-foreground/5 transition-shadow duration-300 hover:shadow-xl dark:shadow-black/25 dark:hover:shadow-black/40">
              <div className="absolute inset-0 rounded-3xl bg-primary/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <div className="relative flex h-full min-h-0 flex-col rounded-[22px] bg-card p-8 sm:p-10">
                <div className="flex min-h-0 flex-1 flex-col">
                  <div className="flex items-start gap-6">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary shadow-md shadow-primary/15">
                      <Target className="h-8 w-8 text-primary-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-2xl font-bold text-foreground sm:text-3xl">
                        {t('ourMission')}
                      </h3>
                      <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
                        {t('missionDescription')}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-8 flex min-h-13 items-center gap-4 rounded-xl bg-muted/40 px-4 py-3">
                  <div className="flex -space-x-2">
                    {MISSION_AVATARS.map((src, index) => (
                      <div
                        key={src}
                        className="relative h-8 w-8 overflow-hidden rounded-full border-2 border-card shadow-sm"
                      >
                        <Image
                          src={src}
                          alt={t('missionAvatarAlt', { n: index + 1 })}
                          fill
                          sizes="32px"
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {t('missionTrusted')}
                  </span>
                </div>
              </div>
            </div>
          </AnimatedSection>

          <AnimatedSection animation="fadeLeft" delay={200} className="h-full">
            <div className="group relative h-full overflow-hidden rounded-3xl bg-card p-1 shadow-sm shadow-foreground/5 transition-shadow duration-300 hover:shadow-xl dark:shadow-black/25 dark:hover:shadow-black/40">
              <div className="absolute inset-0 rounded-3xl bg-primary/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <div className="relative flex h-full min-h-0 flex-col rounded-[22px] bg-card p-8 sm:p-10">
                <div className="flex min-h-0 flex-1 flex-col">
                  <div className="flex items-start gap-6">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary shadow-md shadow-primary/15">
                      <Eye className="h-8 w-8 text-primary-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-2xl font-bold text-foreground sm:text-3xl">
                        {t('ourVision')}
                      </h3>
                      <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
                        {t('visionDescription')}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-8 flex min-h-13 items-center gap-4 rounded-xl bg-muted/40 px-4 py-3">
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <Globe className="h-5 w-5 shrink-0 text-primary" />
                    <span className="text-sm text-muted-foreground">
                      {t('visionSupport')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}
