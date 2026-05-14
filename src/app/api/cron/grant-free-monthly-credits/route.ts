import { and, asc, eq, isNotNull, lte } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { requireCronAuth } from '@/server/api/auth';
import * as logger from '@/server/lib/logger';
import { catchUpFreeMonthlyCreditsFromDueDate } from '@/server/services/free-monthly-credits';
import { getDbHttp } from '@app/db';
import { users } from '@app/db/schema';

export const runtime = 'nodejs';

const TAG = '[Cron:grantFreeMonthlyCredits]';
const BATCH_LIMIT = 500;
const MAX_LOOPS = 20;

async function runGrantFreeMonthlyCreditsJob() {
  const db = getDbHttp();
  const now = new Date();
  let processed = 0;

  for (let i = 0; i < MAX_LOOPS; i++) {
    const rows = await db
      .select({
        uid: users.uid,
        nextFreeCreditGrantAt: users.nextFreeCreditGrantAt,
        freeCreditGrantAnchorDay: users.freeCreditGrantAnchorDay,
      })
      .from(users)
      .where(
        and(
          eq(users.plan, 'free'),
          eq(users.status, '1'),
          isNotNull(users.nextFreeCreditGrantAt),
          lte(users.nextFreeCreditGrantAt, now),
        ),
      )
      .orderBy(asc(users.nextFreeCreditGrantAt))
      .limit(BATCH_LIMIT);

    if (rows.length === 0) break;

    for (const row of rows) {
      const dueAt = row.nextFreeCreditGrantAt;
      if (!dueAt) continue;
      const anchorDay = row.freeCreditGrantAnchorDay ?? dueAt.getUTCDate();
      await catchUpFreeMonthlyCreditsFromDueDate(
        row.uid,
        dueAt,
        anchorDay,
        now,
      );
      processed++;
    }

    if (rows.length < BATCH_LIMIT) break;
  }

  return {
    processed,
    asOf: now.toISOString(),
  };
}

export async function POST(request: Request) {
  const auth = requireCronAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const result = await runGrantFreeMonthlyCreditsJob();
    logger.info(`${TAG} Completed`, result);
    return NextResponse.json({ code: 0, message: 'ok', data: result });
  } catch (error) {
    logger.error(`${TAG} Failed`, { error });
    return NextResponse.json(
      { code: 500, message: 'Internal server error', data: null },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  return POST(request);
}
