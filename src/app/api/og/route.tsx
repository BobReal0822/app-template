import {
  type MarketingOgImageKey,
  MARKETING_OG_IMAGE_KEYS,
} from '@/app/[locale]/(marketing)/_shared/seo';
import { warn } from '@/server/lib/logger';

import { renderOgImageResponse } from './_render';

function isMarketingKey(value: string | null): value is MarketingOgImageKey {
  return (
    value !== null &&
    (MARKETING_OG_IMAGE_KEYS as readonly string[]).includes(value)
  );
}

function fallbackResponse(origin: string): Response {
  return Response.redirect(`${origin}/share/og/default.jpg`, 302);
}

// Kept as a backstop for ad-hoc previews (e.g. social validators that bypass cached
// static assets). Production OG URLs in `seo.ts` and `manifest.ts` point at the
// build-time-rendered PNGs under `/share/og/<key>-v2.png`.
//
// CDN: response must depend only on URL (no `cookies()`/`headers()` user state, no `Set-Cookie`) so shared cache works; `/api/*` is excluded from middleware that would set cookies. See `./_config.ts` for non-English OG.
export async function GET(req: Request): Promise<Response> {
  const requestUrl = new URL(req.url);
  const origin = requestUrl.origin;
  const keyParam = requestUrl.searchParams.get('key');

  if (!isMarketingKey(keyParam)) {
    return fallbackResponse(origin);
  }

  let response: Response | null;
  try {
    response = await renderOgImageResponse(keyParam);
  } catch (error) {
    warn('[OgImage] render threw', { key: keyParam }, error);
    return fallbackResponse(origin);
  }
  if (!response) {
    warn('[OgImage] render returned null (missing OG_CONTENT?)', {
      key: keyParam,
    });
    return fallbackResponse(origin);
  }

  const headers = new Headers(response.headers);
  headers.set(
    'Cache-Control',
    'public, max-age=86400, stale-while-revalidate=2592000',
  );
  headers.set(
    'CDN-Cache-Control',
    'public, max-age=2592000, stale-while-revalidate=31536000',
  );
  headers.set('Vary', 'Accept-Encoding');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
