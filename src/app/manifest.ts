import { MetadataRoute } from 'next';
import { getTranslations } from 'next-intl/server';

// Single theme/background in manifest; `layout.tsx` `viewport.themeColor` handles light/dark chrome.
const BRAND_THEME_COLOR = '#1c69e3';
const BRAND_BACKGROUND_COLOR = '#fdfdfd';

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const t = await getTranslations({ locale: 'en', namespace: 'manifest' });

  return {
    id: '/',
    name: t('name'),
    short_name: t('shortName'),
    description: t('description'),
    lang: 'en',
    dir: 'ltr',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    theme_color: BRAND_THEME_COLOR,
    background_color: BRAND_BACKGROUND_COLOR,
    categories: ['business', 'productivity'],
    icons: [
      {
        src: '/favicon.ico',
        sizes: '32x32',
        type: 'image/x-icon',
      },
      {
        src: '/logo/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/logo/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      // Opaque PWA icons only — not theme `icon-light/dark` (transparent; wrong for install surfaces). TODO: 512 maskable.
    ],
    shortcuts: [
      {
        name: 'Open workspace',
        short_name: 'Workspace',
        description: 'Open your workspace',
        url: '/app',
        icons: [
          {
            src: '/logo/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
        ],
      },
      {
        name: 'View pricing',
        short_name: 'Pricing',
        description: 'Compare plans and pricing',
        url: '/pricing',
        icons: [
          {
            src: '/logo/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
        ],
      },
    ],
  };
}
