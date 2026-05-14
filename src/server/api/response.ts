/**
 * Server-side response helpers for Next.js Route Handlers.
 *
 * The shared `ErrorCode` / `ErrorMessages` / `ApiResponse` definitions live in
 * `@/lib/api/response` so the browser can use them too (e.g. mapping
 * `response.code` to a user-facing string). This module layers
 * `NextResponse`-returning helpers on top.
 */

import { NextResponse } from 'next/server';

import { type ApiResponse, ErrorCode, ErrorMessages } from '@/lib/api/response';

export { ErrorCode, ErrorMessages, type ApiResponse };

export function buildSuccess<T>(
  data: T,
  message: string = ErrorMessages[ErrorCode.SUCCESS],
): ApiResponse<T> {
  return { code: ErrorCode.SUCCESS, message, data };
}

/**
 * Build an error envelope. Generic in `T` so callers can return error results
 * from a typed `Promise<ApiResponse<T | null>>` handler without casts.
 */
export function buildError<T = unknown>(
  code: ErrorCode,
  message?: string,
  data: T | null = null,
): ApiResponse<T | null> {
  return { code, message: message ?? ErrorMessages[code], data };
}

export function buildQuotaExceeded(
  required: number,
  available: number,
): ApiResponse<{ required: number; available: number }> {
  return {
    code: ErrorCode.QUOTA_EXCEEDED,
    message: ErrorMessages[ErrorCode.QUOTA_EXCEEDED],
    data: { required, available },
  };
}

/**
 * Wrap an `ApiResponse` in a `NextResponse`. We always return HTTP 200 — the
 * envelope's `code` field carries error semantics. Sole HTTP-level non-200:
 * 401 from auth middleware (so browsers / fetch tooling can short-circuit on
 * token expiry without parsing the body).
 */
export function jsonOk<T>(payload: ApiResponse<T>): NextResponse {
  return NextResponse.json(payload, { status: 200 });
}

export function createResponse<T = unknown>(
  payload: ApiResponse<T>,
  status?: number,
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(payload, { status: status ?? 200 });
}

export function ok<T>(data: T, message?: string): NextResponse {
  return jsonOk(buildSuccess(data, message));
}

export function fail(
  code: ErrorCode,
  message?: string,
  data?: unknown,
): NextResponse {
  return jsonOk(buildError(code, message, data));
}
