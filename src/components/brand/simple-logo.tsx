'use client';

import { useEffect, useState } from 'react';

import Image from 'next/image';
import { useTheme } from 'next-themes';

import { Link } from '@/i18n/routing';
import { cn } from '@/lib/utils';

interface SimpleLogoProps {
  theme?: 'light' | 'dark';
  className?: string;
  width?: number;
  height?: number;
  src?: string;
  alt?: string;
  disableLink?: boolean;
}

/** Compact icon mark for toolbars; theme from `next-themes` or `theme` override. */
export function SimpleLogo({
  theme: themeOverride,
  className,
  width = 20,
  height = 20,
  src,
  alt = 'App Template',
  disableLink = false,
}: SimpleLogoProps) {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, theme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  const actualThemeFromHook = resolvedTheme || theme;
  const isDark = themeOverride
    ? themeOverride === 'dark'
    : mounted && actualThemeFromHook === 'dark';
  const themeDefaultSrc = isDark
    ? '/logo/icon-dark-v6.png'
    : '/logo/icon-light-v6.png';
  const effectiveSrc = src ?? themeDefaultSrc;

  const logoImage = (
    <Image
      src={effectiveSrc}
      alt={alt}
      width={width}
      height={height}
      className="select-none"
    />
  );

  if (disableLink) {
    return (
      <div className={cn('flex items-center', className)}>{logoImage}</div>
    );
  }

  return (
    <Link href="/" className={cn('flex items-center rounded-full', className)}>
      {logoImage}
    </Link>
  );
}
