/**
 * POST /api/feedback — Vercel Route Handler.
 *
 * Auth is REQUIRED. Mirrors the Postgres schema decision where `feedbacks.uid`
 * is NOT NULL.
 */

import { requireAuth } from '@/server/api/auth';
import { jsonOk } from '@/server/api/response';
import { handleCreateFeedback } from '@/server/handlers/feedback';

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

  const result = await handleCreateFeedback(
    {
      content: input.content,
      email: input.email,
      source: input.source,
      category: input.category,
      meta: input.meta,
      attrs: input.attrs,
    },
    { uid: auth.user.uid, email: auth.user.email },
  );

  return jsonOk(result);
}
