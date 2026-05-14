/**
 * `POST /api/billing/create-checkout-session` — Vercel Route Handler.
 *
 * Authenticated via Bearer ID token; delegates to `handleCreateCheckoutSession`.
 */

import { requireAuth } from '@/server/api/auth';
import { jsonOk } from '@/server/api/response';
import { handleCreateCheckoutSession } from '@/server/handlers/billing-checkout';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request): Promise<Response> {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const input =
    body && typeof body === 'object' && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : {};

  const result = await handleCreateCheckoutSession(input, {
    uid: auth.user.uid,
    email: auth.user.email,
  });

  return jsonOk(result);
}
