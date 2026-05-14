import { NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';

import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware({
  ...routing,
  localePrefix: 'as-needed',
  defaultLocale: 'en',
});

const LOCALE_SEGMENTS = new Set(['en', 'zh']);
const CACHEABLE_MARKETING_SEGMENTS = new Set([
  'about',
  'features',
  'feedback',
  'pricing',
  'privacy',
  'terms',
]);

/**
 * CDN-friendly cache header for public marketing documents.
 * - `public`: shared caches (Vercel edge) may store this response.
 * - `max-age=0`: browsers always revalidate so policy edits propagate fast.
 * - `s-maxage=86400`: Vercel CDN caches for 24h between revalidations.
 * - `stale-while-revalidate=604800`: serve stale up to 7 days while
 *   refreshing in the background — keeps p99 fast even after long quiet
 *   periods.
 */
const MARKETING_CACHE_CONTROL =
  'public, max-age=0, s-maxage=86400, stale-while-revalidate=604800';

/**
 * Public marketing pages should look like static, stateless web documents to
 * crawlers and verification bots. Keep auth, app, API, and dev-test routes
 * out.
 */
function isCacheableMarketingPath(pathname: string): boolean {
  const normalizedPathname = pathname.replace(/\/+$/, '') || '/';
  const segments = normalizedPathname.split('/').filter(Boolean);

  if (segments.length === 0) {
    return true;
  }

  const contentSegments = LOCALE_SEGMENTS.has(segments[0])
    ? segments.slice(1)
    : segments;

  if (contentSegments.length === 0) {
    return true;
  }

  return CACHEABLE_MARKETING_SEGMENTS.has(contentSegments[0]);
}

export default function middleware(request: NextRequest) {
  const response = intlMiddleware(request);

  if (
    response &&
    response.status < 300 &&
    isCacheableMarketingPath(request.nextUrl.pathname)
  ) {
    response.headers.delete('set-cookie');
    response.headers.set('cache-control', MARKETING_CACHE_CONTROL);
  }

  return response;
}

export const config = {
  matcher: [
    '/',
    '/(en|zh)/:path*',
    '/((?!api|_vercel|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|webmanifest|xml|txt|ico)$).*)',
  ],
};
