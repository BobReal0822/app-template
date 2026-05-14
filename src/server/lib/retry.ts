/**
 * Retry utility for transient operations (e.g. R2 upload on callback,
 * DB mutation right after Fal job submit).
 *
 * Shared retry helpers for outbound HTTP / provider calls.
 */

import * as logger from './logger';

export interface RetryOptions {
  /** Maximum number of attempts (including the first). Default 3. */
  maxAttempts?: number;
  /** Delay in ms before each retry. Default 2000. */
  delayMs?: number;
  /** Optional label for logging (e.g. 'R2 upload'). */
  label?: string;
}

const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_DELAY_MS = 2000;

/**
 * Run an async function with retries. On failure, waits `delayMs` then
 * retries until `maxAttempts` is reached. Last failure is rethrown.
 *
 * Note: this is a fixed-delay retry (no exponential backoff). Callers that
 * need backoff should compose it themselves; we deliberately keep the
 * primitive small so it stays easy to reason about for "one quick retry"
 * cases (DB race after Fal accepts, R2 upload blip, etc.).
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    maxAttempts = DEFAULT_MAX_ATTEMPTS,
    delayMs = DEFAULT_DELAY_MS,
    label = 'operation',
  } = options;

  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts) {
        logger.warn(
          `[withRetry] ${label} failed (attempt ${attempt}/${maxAttempts}), retrying in ${delayMs}ms`,
          {
            error: err instanceof Error ? err.message : String(err),
          },
        );
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }
  throw lastError;
}
