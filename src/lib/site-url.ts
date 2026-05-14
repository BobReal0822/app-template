/**
 * Canonical public site origin for metadata, sitemap, JSON-LD, and emails.
 *
 * Set `NEXT_PUBLIC_APP_URL` to the deployment’s public origin so preview/staging
 * match the live URL (sitemap, OG, emails, JSON-LD). Use an **absolute URL**
 * with scheme, e.g. `https://www.example.com` or `https://preview-xxx.vercel.app`.
 * Invalid values fall back to {@link DEFAULT_SITE_ORIGIN} (silent); fix the env
 * if structured data or links point at production unexpectedly.
 */
export const DEFAULT_SITE_ORIGIN = 'https://www.app.example.com';

export function getSiteOrigin(): string {
  const rawOrigin = process.env.NEXT_PUBLIC_APP_URL || DEFAULT_SITE_ORIGIN;
  try {
    return new URL(rawOrigin).origin;
  } catch {
    return DEFAULT_SITE_ORIGIN;
  }
}

/** True only for the Vercel production deployment environment. */
export function isVercelProductionEnv(): boolean {
  return process.env.VERCEL_ENV === 'production';
}

/** Build-time preview check for Vercel preview deployments. */
export function isPreviewEnv(): boolean {
  return process.env.VERCEL_ENV === 'preview';
}

/**
 * Vercel preview deploys and `vercel dev` set `VERCEL_ENV` to `preview` or
 * `development` respectively. Used for allowances that must not apply to
 * production (e.g. CSP `frame-src` for the Vercel Live toolbar iframe).
 */
export function isVercelPreviewOrDevRuntime(): boolean {
  const e = process.env.VERCEL_ENV;
  return e === 'preview' || e === 'development';
}
