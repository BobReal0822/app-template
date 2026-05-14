/**
 * Centralized typed access to environment-driven secrets and config.
 *
 * Each export wraps a single `process.env.<NAME>` lookup behind a `.value()`
 * accessor that:
 *   - Reads `process.env` lazily, so values are picked up correctly on Vercel
 *     (server-only secrets are runtime, `NEXT_PUBLIC_*` are build-time inlined).
 *   - Trims whitespace and falls back to an explicit default when the env var
 *     is unset or empty.
 *
 * Use this module instead of scattering raw `process.env.X` reads when the
 * same value is consumed in more than one place — a single misspelled env
 * name is then a single fix here, not a hunt across handlers.
 *
 * One-off reads (e.g. a route-local feature flag) can still call
 * `process.env.X` directly.
 */

interface ParamLike {
  value: () => string;
}

function envParam(name: string, defaultValue = ''): ParamLike {
  return {
    value() {
      const raw = process.env[name];
      const trimmed = raw?.trim();
      if (trimmed) return trimmed;
      return defaultValue;
    },
  };
}

// ============================================
// ScrapingBee API (product URL crawling)
// ============================================
export const scrapingBeeApiKey = envParam('SBEE_API_KEY');

// ============================================
// Cloudflare R2 Storage
// ============================================
export const r2AccountId = envParam('NEXT_PUBLIC_R2_ACCOUNT_ID');
export const r2AccessKeyId = envParam('R2_ACCESS_KEY_ID');
export const r2SecretAccessKey = envParam('R2_SECRET_ACCESS_KEY');
export const r2BucketName = envParam('R2_BUCKET_NAME');
export const r2PublicDomain = envParam('NEXT_PUBLIC_R2_PUBLIC_DOMAIN');

// ============================================
// Email (Resend)
// ============================================
export const resendApiKey = envParam('RESEND_API_KEY');

// ============================================
// Fal.ai API
// ============================================
export const falApiKey = envParam('FAL_API_KEY');
export const falWebhookToken = envParam('FAL_WEBHOOK_TOKEN');

// ============================================
// MiniMax / ElevenLabs (TTS)
// ============================================
export const minimaxApiKey = envParam('MINIMAX_API_KEY');
export const elevenlabsApiKey = envParam('ELEVENLABS_API_KEY');

// ============================================
// Vercel AI Gateway
// ============================================
export const aiGatewayApiKey = envParam('AI_GATEWAY_API_KEY');

// ============================================
// Google Cloud Storage
// ============================================
export const gcsBucket = envParam('GCS_BUCKET');

/** Public app URL (used for email links and webhook callback URLs). */
export const appUrl = envParam(
  'NEXT_PUBLIC_APP_URL',
  'https://www.app.example.com',
);

// ============================================
// Stripe Billing
// ============================================
export const stripeSecretKey = envParam('STRIPE_SECRET_KEY');
export const stripeWebhookSecret = envParam('STRIPE_WEBHOOK_SECRET');
export const stripePortalConfigurationId = envParam(
  'STRIPE_PORTAL_CONFIGURATION_ID',
);
