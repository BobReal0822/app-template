import { jsonOk } from '@/server/api/response';
import { handleGetPricingConfig } from '@/server/handlers/billing-pricing-config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET(): Response {
  return jsonOk(handleGetPricingConfig());
}
