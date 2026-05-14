'use client';

import { useState, useEffect } from 'react';

import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';

import { Link } from '@/i18n/routing';
import { cn } from '@/lib/utils';

type BannerNamespace = 'welcome';

interface BannerItem {
  id: number;
  titleKey: `${BannerNamespace}.title`;
  descriptionKey: `${BannerNamespace}.description`;
  image: string;
  ctaKey: `${BannerNamespace}.cta`;
  href: string;
  badgeKey: `${BannerNamespace}.badge`;
}

const banners: BannerItem[] = [
  {
    id: 1,
    titleKey: 'welcome.title',
    descriptionKey: 'welcome.description',
    image: '/images/banners/banner-1-v0.png',
    ctaKey: 'welcome.cta',
    href: '/app',
    badgeKey: 'welcome.badge',
  },
];

export function HomeBanner() {
  const t = useTranslations('appHome.homeBanner');
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentBanner = banners[currentIndex];
  const totalBanners = banners.length;

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const goToPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  };

  return (
    <div
      className="relative h-[200px] overflow-hidden rounded-lg"
      role="region"
      aria-roledescription="carousel"
      aria-label={t('a11y.carouselLabel')}
    >
      <p className="sr-only" aria-live="polite">
        {t('a11y.currentSlide', {
          current: currentIndex + 1,
          total: totalBanners,
          title: t(currentBanner.titleKey),
        })}
      </p>
      {banners.map((banner, index) => (
        <div
          key={banner.id}
          className={cn(
            'absolute inset-0 transition-opacity duration-500',
            index === currentIndex
              ? 'opacity-100'
              : 'opacity-0 pointer-events-none',
          )}
        >
          <Image
            src={banner.image || '/placeholder.webp'}
            alt={t(banner.titleKey)}
            fill
            sizes="100vw"
            className="object-cover"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(90deg, rgba(0,0,0,0.32) 0%, rgba(0,0,0,0.14) 28%, rgba(0,0,0,0) 45%)',
            }}
          />

          <div className="absolute inset-0 flex items-center px-16">
            <div className="max-w-xl">
              <div className="mb-3 inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
                {t(banner.badgeKey)}
              </div>
              <h3 className="text-3xl font-bold text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.1)] [text-shadow:0_1px_1px_rgba(0,0,0,0.2)]">
                {t(banner.titleKey)}
              </h3>
              <p className="mt-2 line-clamp-2 text-base text-white/90">
                {t(banner.descriptionKey)}
              </p>
              <Button
                asChild
                size="sm"
                variant="secondary"
                className="mt-4 rounded-md"
              >
                <Link href={banner.href}>
                  {t(banner.ctaKey)}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      ))}

      {banners.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            onClick={goToPrev}
            className="absolute left-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white/20 text-white backdrop-blur-sm hover:bg-white/30"
            aria-label={t('a11y.previousSlide')}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={goToNext}
            className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white/20 text-white backdrop-blur-sm hover:bg-white/30"
            aria-label={t('a11y.nextSlide')}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
            {banners.map((_, index) => (
              <Button
                key={index}
                variant="ghost"
                onClick={() => setCurrentIndex(index)}
                aria-label={t('a11y.goToSlide', {
                  index: index + 1,
                  total: totalBanners,
                })}
                aria-current={index === currentIndex ? 'true' : undefined}
                className={cn(
                  'h-1.5 rounded-full transition-[width,background-color] p-0 hover:bg-transparent',
                  index === currentIndex
                    ? 'w-6 bg-white'
                    : 'w-1.5 bg-white/50 hover:bg-white/70',
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
