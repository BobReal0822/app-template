import { getSiteOrigin, isPreviewEnv } from '@/lib/site-url';

import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const siteOrigin = getSiteOrigin();

  if (isPreviewEnv()) {
    return {
      rules: [
        {
          userAgent: '*',
          disallow: '/',
        },
      ],
    };
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/api/og', '/'],
        disallow: [
          '/api/',
          '/app/',
          '/zh/app/',
          '/auth/',
          '/zh/auth/',
          '/feedback/',
          '/zh/feedback/',
          '/dev-test/',
          '/zh/dev-test/',
          '/_next/',
        ],
      },
    ],
    sitemap: `${siteOrigin}/sitemap.xml`,
  };
}
