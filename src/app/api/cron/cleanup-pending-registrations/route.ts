import { getDbHttp } from '@repo/db';
import { pendingRegistrations } from '@repo/db/schema';
import { lt } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { requireCronAuth } from '@/server/api/auth';
import * as logger from '@/server/lib/logger';

export const runtime = 'nodejs';

const TAG = '[Cron:cleanupPendingRegistrations]';

async function cleanupPendingRegistrations() {
  const db = getDbHttp();
  const now = new Date();
  const deleted = await db
    .delete(pendingRegistrations)
    .where(lt(pendingRegistrations.expiresAt, now))
    .returning({ email: pendingRegistrations.email });
  return { deleted: deleted.length, asOf: now.toISOString() };
}

export async function POST(request: Request) {
  const auth = requireCronAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const result = await cleanupPendingRegistrations();
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
