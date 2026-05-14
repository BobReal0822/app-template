/**
 * Hello / health check handler (Vercel Route Handler side).
 *
 * Lightweight health check for ops scripts that probe
 * the API (uptime checks, smoke tests) get the exact same envelope shape
 * regardless of which backend is currently serving the route.
 */

import { buildSuccess, type ApiResponse } from '@/server/api/response';

export interface HelloResult {
  message: string;
  timestamp: string;
  method: 'GET' | 'POST';
  echo?: unknown;
}

export function helloGet(): ApiResponse<HelloResult> {
  return buildSuccess({
    message: 'Hello World from Vercel!',
    timestamp: new Date().toISOString(),
    method: 'GET',
  });
}

export function helloPost(body: unknown): ApiResponse<HelloResult> {
  return buildSuccess({
    message: 'Hello World (POST)!',
    echo: body ?? {},
    timestamp: new Date().toISOString(),
    method: 'POST',
  });
}
