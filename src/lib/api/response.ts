/**
 * Single source of truth for API response shapes used across the app.
 *
 * Both the browser (e.g. `ErrorMessages[code]` lookups in pages) and the server
 * (`@/server/api/response` re-exports `ErrorCode` from this module) consume the
 * `ErrorCode` enum, so it intentionally lives outside `src/server/`.
 *
 * Server-only `NextResponse` helpers (`ok`/`fail`/`jsonOk`/`build*`) live in
 * `@/server/api/response` to keep client bundles free of server runtimes.
 */

export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
}

/**
 * Numeric error codes returned in `ApiResponse.code`.
 *
 * Grouped by digit prefix:
 * - 1xxx: parameter / request shape
 * - 2xxx: user / auth
 * - 3xxx: task / operation
 * - 4xxx: resource / data
 * - 5xxx: system / server / network
 *
 * IMPORTANT: This enum must remain a strict **superset** across client and
 * server consumers. Adding new values is fine; renaming or renumbering an
 * existing value is a breaking change for any in-flight client.
 */
export enum ErrorCode {
  SUCCESS = 0,

  MISSING_PARAMETER = 1001,
  INVALID_PARAMETER = 1002,
  INVALID_REQUEST_BODY = 1003,
  INVALID_REQUEST_FORMAT = 1004,
  METHOD_NOT_ALLOWED = 1005,
  VALIDATION_ERROR = 1006,

  UNAUTHORIZED = 2001,
  FORBIDDEN = 2002,
  USER_NOT_FOUND = 2003,
  INVALID_CREDENTIALS = 2004,
  USER_ALREADY_EXISTS = 2005,
  TOKEN_EXPIRED = 2006,
  TOKEN_INVALID = 2007,
  INSUFFICIENT_PERMISSIONS = 2008,
  INSUFFICIENT_CREDITS = 2009,

  TASK_NOT_FOUND = 3001,
  TASK_ALREADY_EXISTS = 3002,
  TASK_CREATION_FAILED = 3003,
  TASK_UPDATE_FAILED = 3004,
  TASK_DELETION_FAILED = 3005,
  OPERATION_FAILED = 3006,
  OPERATION_TIMEOUT = 3007,

  RESOURCE_NOT_FOUND = 4001,
  RESOURCE_ALREADY_EXISTS = 4002,
  DATA_NOT_FOUND = 4003,
  DATA_INVALID = 4004,
  DATA_CONFLICT = 4005,
  QUOTA_EXCEEDED = 4006,
  STRIPE_CUSTOMER_REQUIRED = 4010,

  INTERNAL_SERVER_ERROR = 5001,
  DATABASE_ERROR = 5002,
  EXTERNAL_SERVICE_ERROR = 5003,
  SERVICE_UNAVAILABLE = 5004,
  RATE_LIMIT_EXCEEDED = 5005,
  NETWORK_ERROR = 5006,
}

/**
 * Default English message for each `ErrorCode`.
 *
 * Used by both server handlers (when no explicit message is passed to
 * `errorResponse` / `buildError`) and client error UI (`ErrorMessages[code]`).
 */
export const ErrorMessages: Record<ErrorCode, string> = {
  [ErrorCode.SUCCESS]: 'Success',

  [ErrorCode.MISSING_PARAMETER]: 'Missing required parameter',
  [ErrorCode.INVALID_PARAMETER]: 'Invalid parameter',
  [ErrorCode.INVALID_REQUEST_BODY]: 'Invalid request body',
  [ErrorCode.INVALID_REQUEST_FORMAT]: 'Invalid request format',
  [ErrorCode.METHOD_NOT_ALLOWED]: 'Method not allowed',
  [ErrorCode.VALIDATION_ERROR]: 'Validation error',

  [ErrorCode.UNAUTHORIZED]: 'Unauthorized',
  [ErrorCode.FORBIDDEN]: 'Forbidden',
  [ErrorCode.USER_NOT_FOUND]: 'User not found',
  [ErrorCode.INVALID_CREDENTIALS]: 'Invalid credentials',
  [ErrorCode.USER_ALREADY_EXISTS]: 'User already exists',
  [ErrorCode.TOKEN_EXPIRED]: 'Token expired',
  [ErrorCode.TOKEN_INVALID]: 'Invalid token',
  [ErrorCode.INSUFFICIENT_PERMISSIONS]: 'Insufficient permissions',
  [ErrorCode.INSUFFICIENT_CREDITS]: 'Insufficient credits',

  [ErrorCode.TASK_NOT_FOUND]: 'Task not found',
  [ErrorCode.TASK_ALREADY_EXISTS]: 'Task already exists',
  [ErrorCode.TASK_CREATION_FAILED]: 'Task creation failed',
  [ErrorCode.TASK_UPDATE_FAILED]: 'Task update failed',
  [ErrorCode.TASK_DELETION_FAILED]: 'Task deletion failed',
  [ErrorCode.OPERATION_FAILED]: 'Operation failed',
  [ErrorCode.OPERATION_TIMEOUT]: 'Operation timeout',

  [ErrorCode.RESOURCE_NOT_FOUND]: 'Resource not found',
  [ErrorCode.RESOURCE_ALREADY_EXISTS]: 'Resource already exists',
  [ErrorCode.DATA_NOT_FOUND]: 'Data not found',
  [ErrorCode.DATA_INVALID]: 'Invalid data',
  [ErrorCode.DATA_CONFLICT]: 'Data conflict',
  [ErrorCode.QUOTA_EXCEEDED]: 'Quota exceeded',
  [ErrorCode.STRIPE_CUSTOMER_REQUIRED]: 'Billing profile not found',

  [ErrorCode.INTERNAL_SERVER_ERROR]: 'Internal server error',
  [ErrorCode.DATABASE_ERROR]: 'Database error',
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: 'External service error',
  [ErrorCode.SERVICE_UNAVAILABLE]: 'Service unavailable',
  [ErrorCode.RATE_LIMIT_EXCEEDED]: 'Rate limit exceeded',
  [ErrorCode.NETWORK_ERROR]: 'Network error',
};

export function successResponse<T = unknown>(
  data: T,
  message: string = ErrorMessages[ErrorCode.SUCCESS],
): ApiResponse<T> {
  return {
    code: ErrorCode.SUCCESS,
    message,
    data,
  };
}

export function errorResponse(
  code: ErrorCode,
  message?: string,
  data: unknown | null = null,
): ApiResponse<unknown> {
  return {
    code,
    message: message || ErrorMessages[code],
    data,
  };
}
