// Satori only supports `<img>` here, not `next/image`.
/* eslint-disable @next/next/no-img-element */
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

// Imported explicitly because the build-time renderer (`scripts/build-og-images.ts`)
// is run by `tsx`, which falls back to the classic JSX runtime when the project
// tsconfig sets `jsx: "preserve"`. Inside Next.js this import is otherwise
// unnecessary (automatic runtime) but harmless.
import React from 'react';

import { ImageResponse } from 'next/og';

import type { MarketingOgImageKey } from '@/app/[locale]/(marketing)/_shared/seo';

import { getOgContent } from './_config';

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

// logo-light-v3.png is 890×300; use integer divisors of the source for sharp downscale (e.g. ÷6 → ~148×50).
const OG_LOGO_SRC_WIDTH = 890;
const OG_LOGO_SRC_HEIGHT = 300;
const OG_LOGO_SCALE_DENOM = 6;
const OG_LOGO_DISPLAY_WIDTH = OG_LOGO_SRC_WIDTH / OG_LOGO_SCALE_DENOM;
const OG_LOGO_DISPLAY_HEIGHT = OG_LOGO_SRC_HEIGHT / OG_LOGO_SCALE_DENOM;

const COLORS = {
  bg: '#fdfdfd',
  fg: '#090b0f',
  primary: '#1c69e3',
  primarySoft: 'rgba(28,105,227,0.08)',
};

// Geist + Instrument Serif (OFL) under `_fonts/`: no per-request fetches, not exposed like `public/`.
// `_` keeps this out of routing; `next.config.js` `outputFileTracingIncludes` is required for standalone deploys. Cached per instance below.
const OG_FONT_FILES = {
  sansBold: 'Geist-Bold.ttf',
  sansMedium: 'Geist-Medium.ttf',
  serifItalic: 'InstrumentSerif-Italic.ttf',
} as const;

type OgFontKey = keyof typeof OG_FONT_FILES;

const fontCache = new Map<OgFontKey, ArrayBuffer>();

async function loadOgFont(key: OgFontKey): Promise<ArrayBuffer> {
  const cached = fontCache.get(key);
  if (cached) return cached;
  const path = join(
    process.cwd(),
    'src',
    'app',
    'api',
    'og',
    '_fonts',
    OG_FONT_FILES[key],
  );
  const buf = await readFile(path);
  const ab = buf.buffer.slice(
    buf.byteOffset,
    buf.byteOffset + buf.byteLength,
  ) as ArrayBuffer;
  fontCache.set(key, ab);
  return ab;
}

const assetCache = new Map<string, string>();

// Read from `public/` and inline as data URI so Satori does not need an HTTP fetch
// at runtime. Same code path is used by the build-time renderer (no live origin).
async function loadPublicAssetDataUrl(
  publicRelativePath: string,
): Promise<string> {
  const cached = assetCache.get(publicRelativePath);
  if (cached) return cached;
  const absolute = join(process.cwd(), 'public', publicRelativePath);
  const buf = await readFile(absolute);
  const lower = publicRelativePath.toLowerCase();
  const mime = lower.endsWith('.png')
    ? 'image/png'
    : lower.endsWith('.jpg') || lower.endsWith('.jpeg')
      ? 'image/jpeg'
      : 'application/octet-stream';
  const dataUrl = `data:${mime};base64,${buf.toString('base64')}`;
  assetCache.set(publicRelativePath, dataUrl);
  return dataUrl;
}

/**
 * Raster backdrop for OG composition (photo only — not `*-v2.png`, which already
 * includes headline/logo). Prefer PNG when present; fall back to JPEG, then
 * `default.jpg` so `/api/og` and `build:og` never hard-crash on a missing file.
 */
function resolveOgBackdropRelativePath(
  baseImageKey: MarketingOgImageKey,
): string {
  const root = join(process.cwd(), 'public');
  const candidates = [
    `share/og/${baseImageKey}.png`,
    `share/og/${baseImageKey}.jpg`,
  ] as const;
  for (const rel of candidates) {
    if (existsSync(join(root, rel))) return rel;
  }
  return 'share/og/default.jpg';
}

function ogRasterBackdropAlt(content: {
  eyebrow: string;
  lines: { text: string }[][];
}): string {
  const headline = content.lines
    .map((line) => line.map((segment) => segment.text).join(' '))
    .join(' ');
  return `App Template social preview — ${content.eyebrow}: ${headline}`;
}

export async function renderOgImageResponse(
  key: MarketingOgImageKey,
): Promise<ImageResponse | null> {
  const content = getOgContent(key);
  if (!content) return null;

  const baseImageKey = content.baseImageKey ?? key;

  const hasEmphasis = content.lines.some((line) =>
    line.some((seg) => seg.emphasis),
  );

  const [sansBold, sansMedium, serifItalic, baseImageDataUrl, logoDataUrl] =
    await Promise.all([
      loadOgFont('sansBold'),
      loadOgFont('sansMedium'),
      hasEmphasis ? loadOgFont('serifItalic') : Promise.resolve(null),
      loadPublicAssetDataUrl(resolveOgBackdropRelativePath(baseImageKey)),
      loadPublicAssetDataUrl('logo/logo-light-v3.png'),
    ]);

  return new ImageResponse(
    <div
      style={{
        display: 'flex',
        width: `${OG_WIDTH}px`,
        height: `${OG_HEIGHT}px`,
        position: 'relative',
        fontFamily: 'Sans',
        backgroundColor: COLORS.bg,
      }}
    >
      <img
        src={baseImageDataUrl}
        alt={ogRasterBackdropAlt(content)}
        width={OG_WIDTH}
        height={OG_HEIGHT}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: `${OG_WIDTH}px`,
          height: `${OG_HEIGHT}px`,
          objectFit: 'cover',
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '780px',
          height: `${OG_HEIGHT}px`,
          background:
            'linear-gradient(to right, rgba(253,253,253,0.96) 0%, rgba(253,253,253,0.88) 38%, rgba(253,253,253,0) 72%)',
          display: 'flex',
        }}
      />

      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px 72px',
          width: '640px',
          height: `${OG_HEIGHT}px`,
        }}
      >
        <img
          src={logoDataUrl}
          alt="App Template"
          width={OG_LOGO_DISPLAY_WIDTH}
          height={OG_LOGO_DISPLAY_HEIGHT}
          style={{
            width: `${OG_LOGO_DISPLAY_WIDTH}px`,
            height: `${OG_LOGO_DISPLAY_HEIGHT}px`,
            objectFit: 'contain',
          }}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          <div
            style={{
              display: 'flex',
              alignSelf: 'flex-start',
              fontSize: '18px',
              letterSpacing: '0.02em',
              color: COLORS.primary,
              fontWeight: 500,
              background: COLORS.primarySoft,
              padding: '8px 16px',
              borderRadius: '999px',
            }}
          >
            {content.eyebrow}
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              fontSize: '68px',
              lineHeight: 1.08,
              fontWeight: 700,
              color: COLORS.fg,
              letterSpacing: '-0.02em',
            }}
          >
            {content.lines.map((line, lineIdx) => (
              <div key={lineIdx} style={{ display: 'flex', flexWrap: 'wrap' }}>
                {line.map((segment, segIdx) => {
                  if (!segment.emphasis) {
                    return <span key={segIdx}>{segment.text}</span>;
                  }
                  return (
                    <span
                      key={segIdx}
                      style={{
                        fontFamily: 'Serif',
                        fontStyle: 'italic',
                        fontWeight: 400,
                        color: COLORS.primary,
                        margin: '0 0.16em',
                      }}
                    >
                      {segment.text}
                    </span>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '24px',
            color: COLORS.primary,
            fontWeight: 500,
          }}
        >
          <div
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '999px',
              background: COLORS.primary,
              display: 'flex',
            }}
          />
          app.example.com
        </div>
      </div>
    </div>,
    {
      width: OG_WIDTH,
      height: OG_HEIGHT,
      fonts: [
        { name: 'Sans', data: sansBold, weight: 700, style: 'normal' },
        { name: 'Sans', data: sansMedium, weight: 500, style: 'normal' },
        ...(serifItalic
          ? [
              {
                name: 'Serif' as const,
                data: serifItalic,
                weight: 400 as const,
                style: 'italic' as const,
              },
            ]
          : []),
      ],
    },
  );
}
