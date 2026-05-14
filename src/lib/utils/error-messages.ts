/**
 * Client-side error message utilities with i18n support
 *
 * This module provides utilities to get localized error messages
 * based on API error codes. Use with next-intl translations.
 *
 * Security Note: Never display backend error messages directly.
 * Always use error codes to map to localized, user-friendly messages.
 */

/**
 * Translation function type compatible with next-intl's useTranslations hook
 * Uses a permissive key type to work with next-intl's strict typing
 */
type TranslationFunction = {
  // Using 'any' for key to be compatible with next-intl's MessageKeys type
  (key: any): string;
};

/**
 * Get localized error message from API error code
 *
 * @param t - Translation function from useTranslations('errors')
 * @param code - API error code (number)
 * @returns Localized error message
 *
 * @example
 * ```typescript
 * import { useTranslations } from 'next-intl';
 * import { getErrorMessage } from '@/lib/utils/error-messages';
 *
 * function MyComponent() {
 *   const t = useTranslations('errors');
 *
 *   const handleApiError = (response: ApiResponse) => {
 *     if (response.code !== 0) {
 *       const message = getErrorMessage(t, response.code);
 *       toast.error(message);
 *     }
 *   };
 * }
 * ```
 */
export function getErrorMessage(
  t: TranslationFunction,
  code: number | undefined,
): string {
  // If no code provided, return default error message
  if (code === undefined || code === null) {
    return t('default');
  }

  // Success code - no error
  if (code === 0) {
    return '';
  }

  // Try to get message for specific error code
  const codeKey = String(code);

  // Check if the key exists by comparing with the key itself
  // next-intl returns the key if translation is not found
  const message = t(codeKey);

  // If message equals the key, it means translation was not found
  // Return default message instead
  if (message === codeKey || message === `errors.${codeKey}`) {
    return t('default');
  }

  return message;
}

/**
 * Check if an API response indicates an error
 *
 * @param response - API response object with code field
 * @returns true if the response indicates an error (code !== 0)
 */
export function isApiError(response: { code: number }): boolean {
  return response.code !== 0;
}

/**
 * Error code categories for conditional handling
 */
export const ErrorCodeCategory = {
  /** 1xxx: Parameter/Request related errors */
  isParameterError: (code: number) => code >= 1001 && code < 2000,
  /** 2xxx: User/Authentication related errors */
  isAuthError: (code: number) => code >= 2001 && code < 3000,
  /** 3xxx: Task/Operation related errors */
  isTaskError: (code: number) => code >= 3001 && code < 4000,
  /** 4xxx: Resource/Data related errors */
  isResourceError: (code: number) => code >= 4001 && code < 5000,
  /** 5xxx: System/Server related errors */
  isSystemError: (code: number) => code >= 5001 && code < 6000,
} as const;

/**
 * Common error codes for direct comparison
 */
export const ErrorCodes = {
  SUCCESS: 0,
  // Auth errors
  UNAUTHORIZED: 2001,
  FORBIDDEN: 2002,
  TOKEN_EXPIRED: 2006,
  TOKEN_INVALID: 2007,
  // Resource errors
  QUOTA_EXCEEDED: 4006, // Credits quota (for generation tasks)
  // System errors
  INTERNAL_SERVER_ERROR: 5001,
  RATE_LIMIT_EXCEEDED: 5005,
} as const;
