import type { MarketingOgImageKey } from '@/app/[locale]/(marketing)/_shared/seo';

type HeadlineSegment = { text: string; emphasis?: boolean };
type HeadlineLine = HeadlineSegment[];

export type OgPageContent = {
  eyebrow: string;
  lines: HeadlineLine[];
  /** Base raster under `/public/share/og/` (`<key>.png` preferred, else `<key>.jpg`), not `*-v2.png` (composed output). */
  baseImageKey?: MarketingOgImageKey;
};

// English-only by default — bundled fonts have no CJK. To localise: add a
// CJK font + wire `?locale=` in `route.tsx`, `seo.ts`, and `manifest.ts`.
export const OG_CONTENT: Partial<Record<MarketingOgImageKey, OgPageContent>> = {
  home: {
    eyebrow: 'App Template',
    lines: [
      [{ text: 'Ship faster with' }],
      [
        { text: 'a sharper', emphasis: false },
        { text: ' starter', emphasis: true },
      ],
    ],
  },
  pricing: {
    eyebrow: 'Pricing & Plans',
    lines: [
      [{ text: 'Pricing that' }],
      [{ text: 'Scales with You', emphasis: true }],
    ],
    baseImageKey: 'home',
  },
  about: {
    eyebrow: 'About App Template',
    lines: [
      [{ text: 'Built for' }],
      [{ text: 'fast iteration', emphasis: true }],
    ],
    baseImageKey: 'home',
  },
  terms: {
    eyebrow: 'Legal',
    lines: [[{ text: 'Terms of' }, { text: 'Service', emphasis: true }]],
    baseImageKey: 'home',
  },
  privacy: {
    eyebrow: 'Legal',
    lines: [[{ text: 'Privacy' }, { text: 'Policy', emphasis: true }]],
    baseImageKey: 'home',
  },
};

export function getOgContent(key: MarketingOgImageKey): OgPageContent | null {
  return OG_CONTENT[key] ?? null;
}
