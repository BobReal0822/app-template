/**
 * verify-info handler (Vercel Route Handler side).
 *
 * Records a login event to Postgres (`login_logs`) for audit purposes.
 * Verifies user profile completeness and records login telemetry.
 *
 * Important properties (preserved from the Functions implementation):
 *   - Always returns SUCCESS — this is non-critical analytics; failures must
 *     not surface to the user. The boolean `recorded` flag in `data` lets
 *     ops tooling distinguish "wrote" from "swallowed".
 */

import { getDbHttp } from '@repo/db';
import { loginLogs } from '@repo/db/schema';

import { buildSuccess, type ApiResponse } from '@/server/api/response';

export interface VerifyInfoResult {
  recorded: boolean;
}

export interface RecordLoginInput {
  uid: string;
  ip: string;
  userAgent: string;
}

/**
 * Record a login event. Always resolves to a success envelope — failures
 * are logged via console.warn but never thrown. The `recorded` field tells
 * the caller whether the insert actually happened.
 */
export async function handleVerifyInfo(
  input: RecordLoginInput,
): Promise<ApiResponse<VerifyInfoResult>> {
  const { uid, ip, userAgent } = input;

  if (!uid) {
    console.warn('[verify-info] missing uid');
    return buildSuccess({ recorded: false }, 'Login info processing');
  }

  try {
    const db = getDbHttp();
    const rows = await db
      .insert(loginLogs)
      .values({ uid, ip, userAgent })
      .returning({ id: loginLogs.id });

    if (rows.length === 0) {
      console.warn('[verify-info] login log insert returned no row', { uid });
      return buildSuccess({ recorded: false }, 'Login info processing');
    }

    return buildSuccess({ recorded: true }, 'Login info recorded');
  } catch (error) {
    // Login-log insert failures must never break sign-in; log + swallow.
    console.error('[verify-info] failed to record login log', {
      uid,
      error: error instanceof Error ? error.message : String(error),
    });
    return buildSuccess({ recorded: false }, 'Login info processing');
  }
}
