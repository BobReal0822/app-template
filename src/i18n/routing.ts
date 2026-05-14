import { createNavigation } from 'next-intl/navigation';
import { defineRouting } from 'next-intl/routing';

export const LOCALE_COOKIE_NAME = 'NEXT_LOCALE';

export const routing = defineRouting({
  locales: ['en', 'zh'],
  defaultLocale: 'en',
  localeCookie: {
    name: LOCALE_COOKIE_NAME,
  },
  pathnames: {
    '/': '/',
    '/about': { en: '/about', zh: '/about' },
    '/privacy': { en: '/privacy', zh: '/privacy' },
    '/terms': { en: '/terms', zh: '/terms' },
    '/blog': { en: '/blog', zh: '/blog' },
    '/auth/login': { en: '/auth/login', zh: '/auth/login' },
    '/auth/sign-up': { en: '/auth/sign-up', zh: '/auth/sign-up' },
    '/auth/forgot-password': {
      en: '/auth/forgot-password',
      zh: '/auth/forgot-password',
    },
    '/auth/reset-password': {
      en: '/auth/reset-password',
      zh: '/auth/reset-password',
    },
    '/app': { en: '/app', zh: '/app' },
    '/pricing': { en: '/pricing', zh: '/pricing' },
    '/feedback': { en: '/feedback', zh: '/feedback' },
    '/features/url-to-video': {
      en: '/features/url-to-video',
      zh: '/features/url-to-video',
    },
    '/features/video-insight': {
      en: '/features/video-insight',
      zh: '/features/video-insight',
    },
    '/features/product-video': {
      en: '/features/product-video',
      zh: '/features/product-video',
    },
    '/features/product-photo': {
      en: '/features/product-photo',
      zh: '/features/product-photo',
    },
  },
});

export type Pathnames = keyof typeof routing.pathnames;
export type Locale = (typeof routing.locales)[number];

/**
 * Pathname as crawlers and the address bar see it with
 * `localePrefix: 'as-needed'` (default locale omits `/en`).
 *
 * Use with `redirect` from `next/navigation` when next-intl's `redirect()`
 * would incorrectly emit a prefixed default-locale URL (e.g. `/en/auth/login`).
 */
export function pathnameWithLocale(
  locale: Locale | string,
  pathname: string,
): string {
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return locale === routing.defaultLocale ? path : `/${locale}${path}`;
}

export const { Link, getPathname, redirect, usePathname, useRouter } =
  createNavigation<any>(routing);
