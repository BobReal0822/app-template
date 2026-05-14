import { and, asc, eq, isNotNull, lte } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { requireCronAuth } from '@/server/api/auth';
import { type PlanCode } from '@/server/config/pricing';
import {
  PLAN_CODE_VALUES,
  applyPlanToUserFromScheduler,
  resolveYearlyGrantScheduleState,
} from '@/server/handlers/webhooks/stripe/support';
import { formatGrantMonthUtc } from '@/server/lib/date-utc';
import * as logger from '@/server/lib/logger';
import { getDbHttp } from '@app/db';
import { users } from '@app/db/schema';

export const runtime = 'nodejs';

const TAG = '[Cron:grantYearlyMonthlyCredits]';
const BATCH_LIMIT = 500;
const MAX_LOOPS = 20;
const VALID_PLAN_CODES = new Set<PlanCode>(
  Object.keys(PLAN_CODE_VALUES) as PlanCode[],
);

async function processDueUser(
  row: {
    uid: string;
    plan: string;
    stripeSubscriptionId: string | null;
    nextYearlyCreditGrantAt: Date | null;
    yearlyCreditGrantAnchorDay: number | null;
  },
  now: Date,
): Promise<boolean> {
  const subscriptionId = row.stripeSubscriptionId?.trim() ?? '';
  if (!subscriptionId) {
    logger.warn(`${TAG} Missing stripeSubscriptionId for yearly user`, {
      uid: row.uid,
      plan: row.plan,
      nextYearlyCreditGrantAt:
        row.nextYearlyCreditGrantAt?.toISOString() ?? null,
    });
    return false;
  }

  if (!VALID_PLAN_CODES.has(row.plan as PlanCode)) {
    logger.warn(`${TAG} Invalid yearly plan code`, {
      uid: row.uid,
      plan: row.plan,
      subscriptionId,
    });
    return false;
  }
  const planCode = row.plan as PlanCode;

  const { shouldGrant, nextYearlyCreditGrantAt, dueGrantInstants } =
    resolveYearlyGrantScheduleState(
      row.nextYearlyCreditGrantAt?.toISOString() ?? null,
      row.yearlyCreditGrantAnchorDay,
      now,
    );

  if (
    !shouldGrant ||
    !nextYearlyCreditGrantAt ||
    dueGrantInstants.length === 0
  ) {
    return false;
  }

  for (let i = 0; i < dueGrantInstants.length; i++) {
    const dueGrantAt = new Date(dueGrantInstants[i]);
    if (Number.isNaN(dueGrantAt.getTime())) continue;

    const grantMonth = formatGrantMonthUtc(dueGrantAt);
    const nextDueAtForUpdate =
      dueGrantInstants[i + 1] ?? nextYearlyCreditGrantAt;

    await applyPlanToUserFromScheduler(
      row.uid,
      planCode,
      'yearly',
      nextDueAtForUpdate,
      {
        idempotencyKey: `scheduler_yearly:${subscriptionId}:${grantMonth}`,
        source: 'scheduler_yearly',
        subscriptionId,
        reference: subscriptionId,
        grantMonth,
      },
      row.yearlyCreditGrantAnchorDay,
    );
  }

  return true;
}

async function runGrantYearlyMonthlyCreditsJob() {
  const db = getDbHttp();
  const now = new Date();
  let scanned = 0;
  let granted = 0;

  for (let i = 0; i < MAX_LOOPS; i++) {
    const rows = await db
      .select({
        uid: users.uid,
        plan: users.plan,
        stripeSubscriptionId: users.stripeSubscriptionId,
        nextYearlyCreditGrantAt: users.nextYearlyCreditGrantAt,
        yearlyCreditGrantAnchorDay: users.yearlyCreditGrantAnchorDay,
      })
      .from(users)
      .where(
        and(
          eq(users.status, '1'),
          eq(users.subscriptionBillingCycle, 'yearly'),
          isNotNull(users.nextYearlyCreditGrantAt),
          isNotNull(users.stripeSubscriptionId),
          lte(users.nextYearlyCreditGrantAt, now),
        ),
      )
      .orderBy(asc(users.nextYearlyCreditGrantAt))
      .limit(BATCH_LIMIT);

    if (rows.length === 0) break;

    for (const row of rows) {
      scanned++;
      const didGrant = await processDueUser(row, now);
      if (didGrant) granted++;
    }

    if (rows.length < BATCH_LIMIT) break;
  }

  return {
    scanned,
    granted,
    skipped: scanned - granted,
    asOf: now.toISOString(),
  };
}

export async function POST(request: Request) {
  const auth = requireCronAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const result = await runGrantYearlyMonthlyCreditsJob();
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
