import { getDbHttp } from '@repo/db';
import { idempotencyKeys } from '@repo/db/schema';
import { lt } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { requireCronAuth } from '@/server/api/auth';
import * as logger from '@/server/lib/logger';

export const runtime = 'nodejs';

const TAG = '[Cron:cleanupIdempotencyKeys]';

async function cleanupIdempotencyKeys() {
  const db = getDbHttp();
  const now = new Date();
  const deleted = await db
    .delete(idempotencyKeys)
    .where(lt(idempotencyKeys.expireAt, now))
    .returning({ key: idempotencyKeys.key });
  return { deleted: deleted.length, asOf: now.toISOString() };
}

export async function POST(request: Request) {
  const auth = requireCronAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const result = await cleanupIdempotencyKeys();
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
