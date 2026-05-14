/**
 * Builds callback URLs that we hand to Fal.ai when submitting async jobs.
 *
 * This is the **Vercel-side** version: callbacks always land on our own Vercel
 * deployment at `/api/webhooks/fal/...`. Callbacks always target this app’s
 * public origin (no alternate host alias).
 *
 * Origin selection (most-specific first):
 *   1. `WEBHOOK_BASE_URL` env override — for ngrok during local dev or for
 *      pinning a preview deploy to a custom domain.
 *   2. Production (`VERCEL_ENV === 'production'`) → `NEXT_PUBLIC_APP_URL`
 *      (the stable, customer-facing domain — never the per-deploy URL).
 *   3. Preview / branch deploys (`VERCEL_URL` set) → `https://{VERCEL_URL}`,
 *      so each preview receives its own Fal callbacks instead of polluting
 *      production traffic.
 *   4. Local `next dev` (no Vercel env vars) → `NEXT_PUBLIC_APP_URL` fallback.
 *      For real Fal round-trips locally, set `WEBHOOK_BASE_URL` to your
 *      ngrok / Cloudflare-tunnel URL.
 *
 * Stripe webhooks are configured in the Stripe Dashboard (not built from
 * code) so they are not represented here.
 */

import { appUrl } from './secrets';

function trimSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

/**
 * Returns the origin (no trailing slash, no path) that all Fal callbacks
 * are built on top of.
 */
function getCallbackOrigin(): string {
  const override = process.env.WEBHOOK_BASE_URL;
  if (override?.trim()) {
    return trimSlash(override.trim());
  }

  if (process.env.VERCEL_ENV === 'production') {
    return trimSlash(appUrl.value());
  }

  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl?.trim()) {
    return `https://${trimSlash(vercelUrl.trim())}`;
  }

  return trimSlash(appUrl.value());
}

function buildFalCallbackUrl(
  path: string,
  params: Record<string, string>,
): string {
  const origin = getCallbackOrigin();
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, value);
  }
  const qs = search.toString();
  return `${origin}/api/webhooks/fal${path}${qs ? `?${qs}` : ''}`;
}

export function buildFalImageCallbackUrl(input: {
  itemId: string;
  token: string;
}): string {
  return buildFalCallbackUrl('/image', {
    itemId: input.itemId,
    token: input.token,
  });
}

export function buildFalVideoCallbackUrl(input: {
  itemId: string;
  token: string;
}): string {
  return buildFalCallbackUrl('/video', {
    itemId: input.itemId,
    token: input.token,
  });
}

export function buildFalTranscribeCallbackUrl(input: {
  token: string;
}): string {
  return buildFalCallbackUrl('/transcribe', { token: input.token });
}

export function buildFalTtsCallbackUrl(input: {
  batchId: string;
  index: number;
  token?: string;
}): string {
  return buildFalCallbackUrl('/tts', {
    batchId: input.batchId,
    index: String(input.index),
    token: input.token ?? '',
  });
}

export function buildFalThumbnailCallbackUrl(input: { token: string }): string {
  return buildFalCallbackUrl('/thumbnail', { token: input.token });
}
