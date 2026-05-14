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
  // TIP: insert canonical-host redirects here if you have multiple domains
  // pointing at the same deployment. Example:
  //
  //   const hostname = (request.headers.get('host') ?? '').toLowerCase();
  //   if (hostname === 'www.legacy.example.com') {
  //     const url = request.nextUrl.clone();
  //     url.hostname = 'www.canonical.example.com';
  //     return NextResponse.redirect(url, 301);
  //   }

  const response = intlMiddleware(request);

  // Post-process responses for cacheable marketing pages: strip the
  // `NEXT_LOCALE` cookie that next-intl otherwise sets on every request
  // (Set-Cookie disables Vercel CDN caching) and override the dynamic-by-
  // default `cache-control: private, no-store` with a CDN-friendly value.
  // Skip redirects (3xx) — they should not be long-cached.
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
    // Exclusions: api, _vercel, _next/static, _next/image, favicon.ico,
    // static assets. (If you add Vercel Workflow DevKit later, also exclude
    // `\\.well-known/workflow/` so next-intl never proxies workflow's
    // internal POSTs.)
    '/((?!api|_vercel|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|webmanifest|xml|txt|ico)$).*)',
  ],
};
