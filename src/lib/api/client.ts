/**
 * Browser HTTP API client for app/frontend calls.
 *
 * All requests target same-origin Next.js Route Handlers under `/api`.
 */

/**
 * API Response format (matches backend response.ts)
 */
export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
}

/**
 * API Error class for handling non-success responses
 */
export class ApiError extends Error {
  code: number;
  data: unknown;

  constructor(code: number, message: string, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.data = data;
  }
}

/**
 * Call an app API endpoint.
 */
export async function callApi<T = unknown, D = unknown>(
  endpoint: string,
  data?: D,
  options?: {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    requireAuth?: boolean;
    timeout?: number;
  },
): Promise<ApiResponse<T>> {
  const {
    method = 'POST',
    requireAuth = true,
    timeout = 60000,
  } = options || {};

  const url = `/api${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Better-Auth uses cookie sessions; no client-side bearer token injection.
  // Keep this branch so call sites can still declare auth requirement.
  if (requireAuth) {
    // no-op by design
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const result: ApiResponse<T> = await response.json();

    if (result.code !== 0) {
      throw new ApiError(result.code, result.message, result.data);
    }

    return result;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof ApiError) {
      throw error;
    }

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new ApiError(408, 'Request timeout');
      }
      throw new ApiError(500, 'Request failed');
    }

    throw new ApiError(500, 'Unknown error');
  }
}

/**
 * Call verify-info API to record login information.
 *
 * This is fire-and-forget; failures don't affect user flow.
 */
export async function recordLoginInfo(): Promise<void> {
  try {
    await callApi(
      '/verify-info',
      {},
      {
        timeout: 5000,
      },
    );
  } catch {
    // Silent fail - this is non-critical functionality
  }
}

// Re-export type alias kept for compatibility with existing call sites.
export type { ApiResponse as FunctionsApiResponse };
