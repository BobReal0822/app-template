/**
 * GET / POST /api/hello — health check / smoke test endpoint.
 *
 * Trivial health / smoke endpoint. Validates the full
 * request → response → log → monitoring chain on Vercel before mass-
 * migrating the rest of the sync API surface.
 */

import { jsonOk } from '@/server/api/response';
import { helloGet, helloPost } from '@/server/handlers/hello';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET(): Response {
  return jsonOk(helloGet());
}

export async function POST(req: Request): Promise<Response> {
  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    // Empty / non-JSON body is fine for a smoke endpoint — echo {}.
  }
  return jsonOk(helloPost(body));
}
