/**
 * POST /api/verify-info — record login event (audit / analytics).
 *
 * Records login / client metadata for audit (non-blocking for UX).
 *
 * Auth: required — Better Auth session (`requireAuth`, see `src/server/api/auth.ts`).
 * Behaviour: ALWAYS responds 200 with a success envelope. Failures are
 * swallowed because login-log recording is non-critical analytics — we
 * never want a backend hiccup to disrupt the post-login UX.
 */

import { requireAuth, getClientIp, getUserAgent } from '@/server/api/auth';
import { jsonOk } from '@/server/api/response';
import { handleVerifyInfo } from '@/server/handlers/verify-info';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request): Promise<Response> {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const result = await handleVerifyInfo({
    uid: auth.user.uid,
    ip: getClientIp(req),
    userAgent: getUserAgent(req),
  });

  return jsonOk(result);
}
