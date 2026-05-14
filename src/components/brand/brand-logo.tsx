'use client';

import { useEffect, useState } from 'react';

import Image from 'next/image';
import { useTheme } from 'next-themes';

import { Link } from '@/i18n/routing';
import { cn } from '@/lib/utils';

interface BrandLogoProps {
  className?: string;
  width?: number;
  height?: number;
  /** Default: theme-based `logo-light-v3` / `logo-dark-v3`; SVG uses `<img>`, PNG uses `next/image`. */
  src?: string;
  alt?: string;
  disableLink?: boolean;
}

const LOGO_ASPECT_RATIO = 445 / 150;

export function BrandLogo({
  className,
  width,
  height = 26,
  src,
  alt = 'App Template',
  disableLink = false,
}: BrandLogoProps) {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, theme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  const actualTheme = resolvedTheme || theme;
  const isDark = mounted && actualTheme === 'dark';
  const themeDefaultSrc = isDark
    ? '/logo/logo-dark-v3.png'
    : '/logo/logo-light-v3.png';
  const effectiveSrc = src ?? themeDefaultSrc;

  const effectiveHeight = Math.round(height);
  const effectiveWidth =
    typeof width === 'number'
      ? Math.round(width)
      : Math.round(effectiveHeight * LOGO_ASPECT_RATIO);

  const isSvg = effectiveSrc.endsWith('.svg');

  const logoImage = isSvg ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={effectiveSrc}
      alt={alt}
      width={effectiveWidth}
      height={effectiveHeight}
      className="select-none"
    />
  ) : (
    <Image
      src={effectiveSrc}
      alt={alt}
      width={effectiveWidth}
      height={effectiveHeight}
      className="select-none"
      priority
    />
  );

  if (disableLink) {
    return (
      <div className={cn('flex items-center', className)}>{logoImage}</div>
    );
  }

  return (
    <Link href="/" className={cn('flex items-center', className)}>
      {logoImage}
    </Link>
  );
}
