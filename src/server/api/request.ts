import { ErrorCode, fail } from '@/server/api/response';

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export type ParseJsonObjectResult =
  | { ok: true; body: Record<string, unknown> }
  | { ok: false; response: Response };

/**
 * Parse a non-negative integer from query params.
 * Falls back when input is missing/invalid/negative.
 */
export function parseIntOrDefault(
  input: string | null,
  fallback: number,
): number {
  if (!input) return fallback;
  const num = Number.parseInt(input, 10);
  if (!Number.isFinite(num) || num < 0) return fallback;
  return num;
}

/**
 * Parse a non-negative integer and clamp to an upper bound.
 */
export function parseIntWithMax(
  input: string | null,
  fallback: number,
  max: number,
): number {
  return Math.min(parseIntOrDefault(input, fallback), max);
}

/**
 * Parse a JSON object body for Route Handlers (unified `{ code, message, data }` errors).
 *
 * - Missing/whitespace-only body → `INVALID_REQUEST_BODY`
 * - `SyntaxError` / invalid JSON → `INVALID_REQUEST_BODY`
 * - Array or non-object JSON → `INVALID_REQUEST_BODY`
 */
export async function parseJsonObject(
  req: Request,
): Promise<ParseJsonObjectResult> {
  let text: string;
  try {
    text = await req.text();
  } catch {
    return {
      ok: false,
      response: fail(
        ErrorCode.INVALID_REQUEST_BODY,
        'Could not read request body',
      ),
    };
  }

  if (!text.trim()) {
    return {
      ok: false,
      response: fail(
        ErrorCode.INVALID_REQUEST_BODY,
        'Request body is required',
      ),
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    return {
      ok: false,
      response: fail(
        ErrorCode.INVALID_REQUEST_BODY,
        'Invalid JSON in request body',
      ),
    };
  }

  if (!isObjectRecord(parsed)) {
    return {
      ok: false,
      response: fail(
        ErrorCode.INVALID_REQUEST_BODY,
        'Request body must be a JSON object',
      ),
    };
  }

  return { ok: true, body: parsed };
}
