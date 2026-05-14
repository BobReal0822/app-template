import { MetadataRoute } from 'next';

import {
  getMarketingOgImagePath,
  MARKETING_PATH_TO_OG_KEY,
} from '@/app/[locale]/(marketing)/_shared/seo';
import { getSiteOrigin, isPreviewEnv } from '@/lib/site-url';

const BRAND_LOGO_PATH = '/logo/logo-light-v3.png';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Vercel preview deployments are crawl-blocked at robots.txt and meta
  // tags. The middleware matcher excludes `.xml`, so /sitemap.xml is
  // reachable without basic auth — returning an empty sitemap here prevents
  // leaking the URL inventory of an unreleased preview deployment.
  if (isPreviewEnv()) {
    return [];
  }

  const host = getSiteOrigin();
  const staticPaths = Object.keys(MARKETING_PATH_TO_OG_KEY) as Array<
    keyof typeof MARKETING_PATH_TO_OG_KEY
  >;

  const entries: MetadataRoute.Sitemap = [];

  for (const path of staticPaths) {
    const languages: Record<string, string> = {
      en: path === '' ? `${host}/` : `${host}${path}`,
      zh: path === '' ? `${host}/zh` : `${host}/zh${path}`,
    };

    const ogImage = `${host}${getMarketingOgImagePath(MARKETING_PATH_TO_OG_KEY[path])}`;
    const images =
      path === '' ? [ogImage, `${host}${BRAND_LOGO_PATH}`] : [ogImage];

    const priority = path === '' ? 1.0 : path === '/about' ? 0.8 : 0.3;

    entries.push({
      url: path === '' ? `${host}/` : `${host}${path}`,
      priority,
      alternates: { languages },
      images,
    });

    entries.push({
      url: path === '' ? `${host}/zh` : `${host}/zh${path}`,
      priority,
      alternates: { languages },
      images,
    });
  }

  return entries;
}
