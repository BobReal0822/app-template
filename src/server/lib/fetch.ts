/**
 * Fetch utilities with timeout support.
 */

import * as logger from './logger';

/**
 * Default timeout values (in milliseconds)
 */
export const FETCH_TIMEOUT = {
  /** Default timeout for API calls (30 seconds) */
  API: 30_000,
  /** Default timeout for file downloads/uploads (10 minutes) */
  FILE: 600_000,
  /** Short timeout for quick API calls (8 seconds) */
  QUICK: 8_000,
  /**
   * Partial fetch for image header / dimension probe (stop after metadata).
   * Avoid tying FILE (10m) to a probe that should bail quickly.
   */
  IMAGE_PROBE: 20_000,
} as const;

/**
 * Fetch with timeout support using AbortController.
 *
 * @param url - The URL to fetch
 * @param options - Fetch options (RequestInit)
 * @param timeoutMs - Timeout in milliseconds. Defaults to FETCH_TIMEOUT.API
 * @returns Promise<Response>
 * @throws Error if timeout is exceeded or fetch fails
 *
 * @example
 * ```typescript
 * // API call with default timeout (30s)
 * const response = await fetchWithTimeout('https://api.example.com/data');
 *
 * // File download with longer timeout (10min)
 * const response = await fetchWithTimeout(url, {}, FETCH_TIMEOUT.FILE);
 *
 * // Quick API call with short timeout (8s)
 * const response = await fetchWithTimeout(url, {}, FETCH_TIMEOUT.QUICK);
 * ```
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = FETCH_TIMEOUT.API,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (error) {
    // Check if error is due to timeout
    if (error instanceof Error && error.name === 'AbortError') {
      logger.error(
        `Request timeout after ${timeoutMs}ms: ${url.substring(0, 100)}`,
      );
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
