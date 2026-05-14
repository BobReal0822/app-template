'use client';

import { Check, Play, Sparkles, Sun } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

import { BrowserFrame } from '../features/_shared/visuals/browser-frame';

/**
 * Home marketing hero: BrowserFrame to `/app` (whole workspace, not a single
 * feature). Assets live under `public/images/marketing/home-hero-*` and are
 * decoupled from `product-photo` step demos to avoid cross-import / ratio
 * bugs. Result image uses `priority` for LCP. Bottom strip: decorative
 * “video poster” affordance; real platform ships product video.
 */
const HOME_HERO_INPUT = '/images/marketing/home-hero-input-v1.webp';
const HOME_HERO_RESULT = '/images/marketing/home-hero-result-v2.webp';

export function HeroPreview() {
  const t = useTranslations('home.hero.preview');
  const tPreset = useTranslations('productPhotoPanel.presetLabels');

  return (
    <BrowserFrame
      path="/app"
      className="h-full rounded-2xl"
      contentClassName="bg-linear-to-br from-background via-background to-muted/30"
    >
      <div className="grid h-full grid-cols-1 sm:grid-cols-[30%_1fr]">
        <div className="hidden flex-col gap-3 border-r border-border/50 bg-muted/20 p-4 sm:flex sm:gap-4 sm:p-5">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/80 sm:text-[11px]">
            {t('inputLabel')}
          </span>

          <div className="relative aspect-square overflow-hidden rounded-lg bg-card ring-1 ring-border/50">
            <Image
              src={HOME_HERO_INPUT}
              alt={t('inputAlt')}
              fill
              sizes="(max-width: 1024px) 28vw, 200px"
              className="object-cover"
            />
          </div>

          <p className="line-clamp-2 text-xs leading-relaxed text-foreground/85 sm:text-[13px]">
            {t('brief')}
          </p>

          <span className="inline-flex w-fit items-center gap-1.5 rounded-md bg-card px-2 py-1 text-[10px] font-medium text-foreground/80 ring-1 ring-border/50 sm:text-[11px]">
            <Sun className="h-3 w-3" />
            {tPreset('outdoor')}
          </span>

          <div
            aria-hidden
            className="mt-auto inline-flex items-center justify-center gap-1.5 rounded-md bg-primary/10 px-3 py-2 text-xs font-medium text-primary ring-1 ring-primary/25 sm:text-sm"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {t('generate')}
          </div>
        </div>

        <div className="relative flex h-full items-center justify-center p-3 sm:p-5">
          {/* 1:1 source in a 6:5 box with object-cover — less pillarboxing */}
          <div className="relative h-full aspect-6/5 max-w-full overflow-hidden rounded-xl bg-muted/30 ring-1 ring-border/40">
            <Image
              src={HOME_HERO_RESULT}
              alt={t('resultAlt')}
              fill
              priority
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 520px"
              className="object-cover"
            />

            <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-md bg-background/65 px-1.5 py-0.5 text-[10px] font-medium text-foreground/85 backdrop-blur">
              <Check className="h-2.5 w-2.5 text-success" />
              {t('justGenerated')}
            </span>

            <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-md bg-background/65 px-1.5 py-0.5 text-[10px] font-medium text-foreground/85 backdrop-blur">
              <span className="h-1 w-1 rounded-full bg-primary/80" />
              MP4 · 1080p
            </span>

            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-3 bottom-3 flex items-center gap-2.5 rounded-md bg-background/65 px-2 py-1.5 backdrop-blur"
            >
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full text-foreground/90">
                <Play className="h-2.5 w-2.5 translate-x-px fill-current" />
              </span>
              <div className="relative h-[3px] flex-1 overflow-hidden rounded-full bg-foreground/15">
                <span className="absolute inset-y-0 left-0 w-1/3 rounded-full bg-foreground/70" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}
