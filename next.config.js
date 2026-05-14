// @ts-check
const withNextIntl = require('next-intl/plugin')();

const path = require('path');
const isDev = process.env.NODE_ENV === 'development';

/** @type {Array<{protocol: 'https'; hostname: string; port: string; pathname: string}>} */
const r2Patterns = [];

if (process.env.NEXT_PUBLIC_R2_PUBLIC_DOMAIN) {
  try {
    const domain = process.env.NEXT_PUBLIC_R2_PUBLIC_DOMAIN.startsWith('http')
      ? process.env.NEXT_PUBLIC_R2_PUBLIC_DOMAIN
      : `https://${process.env.NEXT_PUBLIC_R2_PUBLIC_DOMAIN}`;
    const hostname = new URL(domain).hostname;
    r2Patterns.push({
      protocol: 'https',
      hostname: hostname,
      port: '',
      pathname: '/**',
    });
  } catch (e) {
    console.warn('Invalid NEXT_PUBLIC_R2_PUBLIC_DOMAIN:', e);
  }
}

if (process.env.NEXT_PUBLIC_R2_ACCOUNT_ID) {
  r2Patterns.push({
    protocol: 'https',
    hostname: `pub-${process.env.NEXT_PUBLIC_R2_ACCOUNT_ID}.r2.dev`,
    port: '',
    pathname: '/**',
  });
}

// Wildcard fallback for any R2 public domain. `**.r2.dev` matches any
// subdomain (Next.js requires `**` for subdomain wildcards, not `*`).
r2Patterns.push({
  protocol: 'https',
  hostname: '**.r2.dev',
  port: '',
  pathname: '/**',
});

/** @type {import('next').NextConfig} */
const config = {
  compiler: isDev
    ? undefined
    : {
        removeConsole: {
          exclude: ['error'],
        },
      },
  sassOptions: {
    includePaths: [path.join(__dirname, 'styles')],
  },
  // Public marketing pages need CDN-friendly cache headers so verification
  // bots, search engines, and AI crawlers see them as static, public
  // documents. Middleware also sets these — these framework-level headers are
  // a safety net if rendering rewrites Cache-Control later.
  async headers() {
    const marketingCacheHeader = {
      key: 'Cache-Control',
      value:
        'public, max-age=0, s-maxage=86400, stale-while-revalidate=604800',
    };
    return [
      {
        source: '/',
        headers: [marketingCacheHeader],
      },
      {
        source: '/:doc(about|feedback|pricing|privacy|terms)',
        headers: [marketingCacheHeader],
      },
      {
        source: '/:locale(en|zh)',
        headers: [marketingCacheHeader],
      },
      {
        source: '/:locale(en|zh)/:doc(about|feedback|pricing|privacy|terms)',
        headers: [marketingCacheHeader],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      ...r2Patterns,
    ],
  },
};

module.exports = withNextIntl(config);
