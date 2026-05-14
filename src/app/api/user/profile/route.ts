import { eq } from 'drizzle-orm';

import { requireAuth } from '@/server/api/auth';
import { getDbHttp } from '@app/db';
import { users } from '@app/db/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request): Promise<Response> {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const db = getDbHttp();
  const row = await db
    .select({
      uid: users.uid,
      name: users.name,
      avatar: users.avatar,
      credits: users.credits,
      plan: users.plan,
      planCredits: users.planCredits,
      planExpiredAt: users.planExpiredAt,
      cancelAtPeriodEnd: users.cancelAtPeriodEnd,
      subscriptionBillingCycle: users.subscriptionBillingCycle,
    })
    .from(users)
    .where(eq(users.uid, auth.user.uid))
    .limit(1);

  return Response.json({
    code: 0,
    message: 'ok',
    data: {
      user: row[0]
        ? {
            ...row[0],
            planExpiredAt: row[0].planExpiredAt?.toISOString() ?? null,
          }
        : null,
    },
  });
}

export async function POST(req: Request): Promise<Response> {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const body = (await req.json().catch(() => null)) as {
    name?: string;
    avatar?: string;
  } | null;

  const nextName =
    typeof body?.name === 'string' ? body.name.trim() : undefined;
  const nextAvatar =
    typeof body?.avatar === 'string' ? body.avatar.trim() : undefined;

  const payload: Partial<{ name: string; avatar: string }> = {};
  if (nextName !== undefined) payload.name = nextName;
  if (nextAvatar !== undefined) payload.avatar = nextAvatar;

  if (Object.keys(payload).length === 0) {
    return Response.json(
      { code: 400, message: 'No update fields provided', data: null },
      { status: 400 },
    );
  }

  const db = getDbHttp();
  await db.update(users).set(payload).where(eq(users.uid, auth.user.uid));

  return Response.json({ code: 0, message: 'ok', data: null });
}
