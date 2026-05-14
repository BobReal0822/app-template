'use client';

import { useEffect, useState, useRef } from 'react';

import { Play, Type, Sparkles, ShieldCheck, Wand2 } from 'lucide-react';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { DarkImageOverlay } from '@/components/dark-image-overlay';

const showcaseConfig = {
  login: {
    image: '/images/auth-showcase.jpg',
    alt: 'Fashion model in camel coat - AI video ad preview',
    caption: 'A woman in a camel coat, warm smile.',
    timestamp: '01:32',
    timestampPosition: 'top-3 right-3' as const,
    captionPosition: '-bottom-4 -left-6' as const,
    iconPosition: '-right-5 top-1/4' as const,
    icon: 'play' as const,
  },
  'sign-up': {
    image: '/images/auth-signup-showcase.jpg',
    alt: 'White sneakers product showcase - AI video ad preview',
    caption: 'White sneakers, clean minimal hero shot.',
    timestamp: '',
    timestampPosition: 'top-3 left-3' as const,
    captionPosition: '-bottom-4 -right-6' as const,
    iconPosition: '-left-5 top-2/5' as const,
    icon: 'sparkles' as const,
  },
  'forgot-password': {
    image: '/images/auth-forgot-showcase.jpg',
    alt: 'Skincare product showcase - AI video ad preview',
    caption: 'Skincare product, luxurious purple theme.',
    timestamp: '00:24',
    timestampPosition: 'top-3 right-3' as const,
    captionPosition: '-bottom-4 -left-6' as const,
    iconPosition: '-right-5 top-1/3' as const,
    icon: 'shield' as const,
  },
};

const iconMap = {
  play: Play,
  sparkles: Sparkles,
  shield: ShieldCheck,
  wand: Wand2,
};

type ConfigKey = keyof typeof showcaseConfig;

export function AuthShowcasePanel() {
  const t = useTranslations('auth.layout');
  const pathname = usePathname();
  const [phase, setPhase] = useState<'idle' | 'exit' | 'enter'>('idle');
  const [displayConfig, setDisplayConfig] = useState<ConfigKey>('login');
  const prevPathRef = useRef(pathname);

  const getConfigKey = (): ConfigKey => {
    if (pathname?.includes('sign-up')) return 'sign-up';
    if (pathname?.includes('forgot-password')) return 'forgot-password';
    return 'login';
  };

  const currentKey = getConfigKey();

  useEffect(() => {
    if (prevPathRef.current !== pathname) {
      setPhase('exit');
      const swapTimer = setTimeout(() => {
        setDisplayConfig(currentKey);
        setPhase('enter');
      }, 180);
      const settleTimer = setTimeout(() => {
        setPhase('idle');
      }, 360);
      prevPathRef.current = pathname;
      return () => {
        clearTimeout(swapTimer);
        clearTimeout(settleTimer);
      };
    } else {
      setDisplayConfig(currentKey);
    }
  }, [pathname, currentKey]);

  const config = showcaseConfig[displayConfig];
  const IconComponent = iconMap[config.icon];

  const slideClass =
    phase === 'exit'
      ? '-translate-x-8 opacity-0'
      : phase === 'enter'
        ? 'translate-x-8 opacity-0'
        : 'translate-x-0 opacity-100';

  return (
    <div className="relative hidden w-1/2 overflow-hidden lg:block">
      <div className="absolute inset-0 bg-linear-to-br from-primary/10 via-primary/5 to-chart-4/20" />

      <div className="relative flex h-full flex-col px-10 pt-6 pb-12">
        {/* Center - Video card mockup */}
        <div className="flex flex-1 items-center justify-center px-6">
          <div
            className={`relative w-full max-w-[380px] transition-[translate,opacity] duration-200 ease-out ${slideClass}`}
            style={{
              transitionTimingFunction:
                phase === 'idle' ? 'cubic-bezier(0.22, 1, 0.36, 1)' : 'ease-in',
            }}
          >
            {/* Video card */}
            <div className="relative w-full overflow-hidden rounded-3xl bg-chart-4/10 shadow-2xl shadow-foreground/6 dark:shadow-black/45">
              <div className="relative aspect-3/4">
                <Image
                  src={config.image}
                  alt={config.alt}
                  fill
                  className="object-cover object-top"
                  priority
                />
                <DarkImageOverlay strength="strong" />
              </div>

              {/* Timestamp pill - compact, positioned per config */}
              {config.timestamp && (
                <div
                  className={`absolute ${config.timestampPosition} rounded-md bg-foreground/60 px-2 py-0.5 backdrop-blur-sm dark:bg-black/70`}
                >
                  <span className="text-[11px] font-medium tabular-nums leading-none text-background/90 dark:text-white">
                    {config.timestamp}
                  </span>
                </div>
              )}
            </div>

            {/* AI caption bubble - positioned per config */}
            <div
              className={`absolute ${config.captionPosition} flex items-center gap-2 rounded-full bg-background/90 px-4 py-2.5 shadow-lg shadow-foreground/10 backdrop-blur-sm dark:border dark:border-white/20 dark:bg-black/70`}
            >
              <Type className="h-3.5 w-3.5 shrink-0 text-foreground/70 dark:text-white/85" />
              <span className="text-sm text-foreground/80 dark:text-white/95">
                {config.caption}
              </span>
            </div>

            {/* Floating icon - positioned per config */}
            <div
              className={`absolute ${config.iconPosition} flex h-12 w-12 items-center justify-center rounded-full bg-background/90 shadow-lg shadow-foreground/10 backdrop-blur-sm dark:border dark:border-white/20 dark:bg-black/70`}
            >
              <IconComponent
                className="h-5 w-5 text-primary"
                fill={config.icon === 'play' ? 'currentColor' : 'none'}
              />
            </div>
          </div>
        </div>

        {/* Bottom text */}
        <div className="text-center pb-8">
          <h2 className="text-3xl font-bold leading-tight text-foreground">
            {t('headlinePrefix')}
            <span className="text-primary"> {t('headlineHighlight')}</span>
          </h2>
          <p className="mx-auto mt-4 max-w-md text-base text-muted-foreground">
            {t('headlineDescription')}
          </p>
        </div>
      </div>
    </div>
  );
}
