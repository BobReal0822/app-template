/**
 * Billing pricing-config handler.
 *
 * Public — no auth required. Returns the public pricing plans consumed by the
 * marketing site and the in-app upgrade dialog. Stripe price IDs come from
 * env vars (see `src/server/config/pricing.ts`).
 *
 * On config error (missing env var) we still return HTTP 200 with an
 * `INTERNAL_SERVER_ERROR` envelope: clients treat `code !== 0` as failure and
 * we want the marketing site to render a graceful state, not a 500.
 */

import {
  buildSuccess,
  buildError,
  ErrorCode,
  type ApiResponse,
} from '@/server/api/response';
import {
  getPublicPricingConfig,
  type PublicPricingConfig,
} from '@/server/config/pricing';

export function handleGetPricingConfig(): ApiResponse<PublicPricingConfig | null> {
  try {
    return buildSuccess(getPublicPricingConfig());
  } catch (error) {
    console.error('[Billing:getPricingConfig] Error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return buildError(
      ErrorCode.INTERNAL_SERVER_ERROR,
      'Internal server error',
    ) as ApiResponse<null>;
  }
}
