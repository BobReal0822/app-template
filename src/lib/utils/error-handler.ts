/**
 * Unified Error Handler for Edge Function Responses
 *
 * This module provides utilities to handle Edge Function error responses.
 * Use with ErrorHandlerProvider for automatic modal handling.
 *
 * Security Note: This handler uses error codes to display user-friendly messages.
 * Backend error messages are never displayed directly to users.
 */

import { toast } from 'sonner';

import { getErrorMessage } from './error-messages';

export interface EdgeFunctionResponse<T = unknown> {
  code: number;
  message: string;
  data: T | null;
}

export interface ErrorHandlerCallbacks {
  showInsufficientCredits?: (required: number, available: number) => void;
  onUnauthorized?: () => void;
  onRateLimit?: () => void;
  onGenericError?: (message: string) => void;
}

export interface ErrorHandlerOptions {
  /** Translation function from useTranslations('errors') for i18n support */
  t?: (key: string) => string;
  /** Callbacks for handling different error types */
  callbacks?: ErrorHandlerCallbacks;
}

/**
 * Handle Edge Function error responses with unified logic and i18n support
 *
 * @param response - The Edge Function response object
 * @param options - Options including translation function and callbacks
 *
 * @example
 * ```typescript
 * import { useTranslations } from 'next-intl';
 *
 * function MyComponent() {
 *   const t = useTranslations('errors');
 *   const errorHandler = useErrorHandler();
 *
 *   const handleResponse = (response) => {
 *     if (response.code !== 0) {
 *       handleEdgeFunctionError(response, {
 *         t,
 *         callbacks: {
 *           showInsufficientCredits: errorHandler.showInsufficientCredits,
 *         },
 *       });
 *     }
 *   };
 * }
 * ```
 */
export function handleEdgeFunctionError(
  response: EdgeFunctionResponse,
  options: ErrorHandlerOptions = {},
) {
  const { t, callbacks = {} } = options;
  const {
    showInsufficientCredits,
    onUnauthorized,
    onRateLimit,
    onGenericError,
  } = callbacks;

  // Helper to get localized message
  const getMessage = (code: number): string => {
    if (t) {
      return getErrorMessage(t, code);
    }
    // Fallback English messages when no translation function provided
    return getFallbackMessage(code);
  };

  switch (response.code) {
    case 4006: {
      // Insufficient credits error (QUOTA_EXCEEDED)
      // Parse credit info from structured data if available
      const creditData = response.data as {
        required?: number;
        available?: number;
      } | null;

      if (showInsufficientCredits) {
        if (
          creditData?.required !== undefined &&
          creditData?.available !== undefined
        ) {
          showInsufficientCredits(creditData.required, creditData.available);
        } else {
          // Fallback if data format is different
          showInsufficientCredits(1, 0);
        }
      } else {
        // Fallback to toast if no handler provided
        toast.error(getMessage(4006), {
          duration: 6000,
        });
      }
      break;
    }

    case 2001: {
      // Unauthorized error
      if (onUnauthorized) {
        onUnauthorized();
      } else {
        const loginPath =
          typeof window !== 'undefined' &&
          window.location.pathname.startsWith('/zh')
            ? '/zh/auth/login'
            : '/auth/login';
        toast.error(getMessage(2001), {
          action: {
            label: 'Log in',
            onClick: () => {
              window.location.href = loginPath;
            },
          },
          duration: 6000,
        });
      }
      break;
    }

    case 5005: {
      // Rate limit exceeded
      if (onRateLimit) {
        onRateLimit();
      } else {
        toast.error(getMessage(5005), {
          duration: 5000,
        });
      }
      break;
    }

    default: {
      // Generic error - use localized message based on error code
      const errorMessage = getMessage(response.code);

      if (onGenericError) {
        onGenericError(errorMessage);
      } else {
        toast.error(errorMessage, {
          duration: 5000,
        });
      }
      break;
    }
  }
}

/**
 * Fallback English messages when no translation function is provided
 * These should match the messages in messages/en.json
 */
function getFallbackMessage(code: number): string {
  const fallbackMessages: Record<number, string> = {
    1001: 'Missing required information',
    1002: 'Invalid input provided',
    1006: 'Please check your input and try again',
    2001: 'Please log in to continue',
    2002: "You don't have permission to perform this action",
    2006: 'Your session has expired. Please log in again.',
    2007: 'Invalid authentication. Please log in again.',
    3006: 'Operation failed. Please try again.',
    4006: 'You have exceeded your usage limit. Please upgrade your plan.',
    5001: 'Something went wrong. Please try again later.',
    5005: 'Too many requests. Please wait a moment and try again.',
  };

  return fallbackMessages[code] || 'An error occurred. Please try again.';
}
