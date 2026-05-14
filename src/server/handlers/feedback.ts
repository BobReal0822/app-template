/**
 * Feedback handler — pure business logic for `POST /api/feedback`.
 *
 * The Route Handler in `src/app/api/feedback/route.ts` is responsible for
 * extracting the body and the auth user; this module just validates and
 * persists.
 *
 * - Auth is REQUIRED (`feedbacks.uid` is NOT NULL in the Postgres schema).
 * - Field length / value limits are duplicated as constants below so they
 *   live with the validation rules they enforce.
 */

import { getDbHttp } from '@repo/db';
import { feedbacks } from '@repo/db/schema';

import { ErrorCode, buildError, buildSuccess } from '@/server/api/response';
import type { ApiResponse } from '@/server/api/response';
import * as logger from '@/server/lib/logger';

export interface CreateFeedbackInput {
  content: unknown;
  email?: unknown;
  source?: unknown;
  category?: unknown;
  meta?: unknown;
  attrs?: unknown;
}

export interface FeedbackAuthContext {
  uid?: string;
  email?: string;
}

interface FeedbackResultData {
  id: string;
  createdAt: string;
}

const MAX_CONTENT_LENGTH = 3000;
const MAX_ATTACHMENTS = 10;
const MAX_ATTACHMENT_KEY_LENGTH = 500;
const MAX_EMAIL_LENGTH = 255;
const MAX_SOURCE_LENGTH = 64;
const MAX_CATEGORY_LENGTH = 64;
const MAX_META_LENGTH = 10_000;

const ALLOWED_SOURCES = new Set(['in_app_modal', 'marketing_page']);
const ALLOWED_CATEGORIES = new Set([
  'experience',
  'feedback',
  'bug',
  'feature',
  'support',
  'billing',
  'other',
]);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function handleCreateFeedback(
  input: CreateFeedbackInput,
  authUser: FeedbackAuthContext | null,
): Promise<ApiResponse<FeedbackResultData | null>> {
  try {
    if (
      typeof input.content !== 'string' ||
      input.content.trim().length === 0
    ) {
      const isMissing = typeof input.content !== 'string';
      return buildError(
        isMissing ? ErrorCode.MISSING_PARAMETER : ErrorCode.VALIDATION_ERROR,
        isMissing
          ? 'Missing required parameter: content'
          : 'Content cannot be empty',
      ) as ApiResponse<FeedbackResultData | null>;
    }

    const content = input.content.trim();
    const source =
      typeof input.source === 'string' && input.source.trim()
        ? input.source.trim()
        : 'unknown';
    const category =
      typeof input.category === 'string' && input.category.trim()
        ? input.category.trim()
        : 'other';
    const email =
      typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';

    const metaObj =
      input.meta && typeof input.meta === 'object' && !Array.isArray(input.meta)
        ? (input.meta as Record<string, unknown>)
        : {};
    const meta = JSON.stringify(metaObj);
    const attrs = Array.isArray(input.attrs) ? (input.attrs as unknown[]) : [];

    if (content.length > MAX_CONTENT_LENGTH) {
      return buildError(
        ErrorCode.VALIDATION_ERROR,
        `Content must be no more than ${MAX_CONTENT_LENGTH} characters`,
      ) as ApiResponse<FeedbackResultData | null>;
    }

    if (source.length > MAX_SOURCE_LENGTH) {
      return buildError(
        ErrorCode.VALIDATION_ERROR,
        `Source must be no more than ${MAX_SOURCE_LENGTH} characters`,
      ) as ApiResponse<FeedbackResultData | null>;
    }
    if (source !== 'unknown' && !ALLOWED_SOURCES.has(source)) {
      return buildError(
        ErrorCode.INVALID_PARAMETER,
        'Invalid source',
      ) as ApiResponse<FeedbackResultData | null>;
    }

    if (category.length > MAX_CATEGORY_LENGTH) {
      return buildError(
        ErrorCode.VALIDATION_ERROR,
        `Category must be no more than ${MAX_CATEGORY_LENGTH} characters`,
      ) as ApiResponse<FeedbackResultData | null>;
    }
    if (!ALLOWED_CATEGORIES.has(category)) {
      return buildError(
        ErrorCode.INVALID_PARAMETER,
        'Invalid category',
      ) as ApiResponse<FeedbackResultData | null>;
    }

    const uid = authUser?.uid;
    if (!uid) {
      return buildError(
        ErrorCode.UNAUTHORIZED,
        'User authentication required',
      ) as ApiResponse<FeedbackResultData | null>;
    }
    if (email.length > MAX_EMAIL_LENGTH) {
      return buildError(
        ErrorCode.VALIDATION_ERROR,
        `Email must be no more than ${MAX_EMAIL_LENGTH} characters`,
      ) as ApiResponse<FeedbackResultData | null>;
    }
    if (email && !EMAIL_REGEX.test(email)) {
      return buildError(
        ErrorCode.INVALID_PARAMETER,
        'Invalid email',
      ) as ApiResponse<FeedbackResultData | null>;
    }

    if (meta.length > MAX_META_LENGTH) {
      return buildError(
        ErrorCode.VALIDATION_ERROR,
        `Meta must be no more than ${MAX_META_LENGTH} characters`,
      ) as ApiResponse<FeedbackResultData | null>;
    }

    if (attrs.length > MAX_ATTACHMENTS) {
      return buildError(
        ErrorCode.VALIDATION_ERROR,
        `Maximum ${MAX_ATTACHMENTS} attachments allowed`,
      ) as ApiResponse<FeedbackResultData | null>;
    }
    for (const attr of attrs) {
      if (typeof attr !== 'string' || attr.length === 0) {
        return buildError(
          ErrorCode.INVALID_PARAMETER,
          'Invalid attachment key',
        ) as ApiResponse<FeedbackResultData | null>;
      }
      if (attr.length > MAX_ATTACHMENT_KEY_LENGTH) {
        return buildError(
          ErrorCode.VALIDATION_ERROR,
          `Attachment key must be no more than ${MAX_ATTACHMENT_KEY_LENGTH} characters`,
        ) as ApiResponse<FeedbackResultData | null>;
      }
    }

    const db = getDbHttp();
    const rows = await db
      .insert(feedbacks)
      .values({
        uid,
        email: email || authUser?.email || '',
        source,
        category,
        content,
        meta,
        attrs: attrs as string[],
      })
      .returning({
        id: feedbacks.id,
        createdAt: feedbacks.createdAt,
      });

    const inserted = rows[0];
    if (!inserted) {
      logger.error('Feedback insert returned no row', { uid });
      return buildError(
        ErrorCode.DATABASE_ERROR,
        'Failed to create feedback',
      ) as ApiResponse<FeedbackResultData | null>;
    }

    logger.info('Feedback created', {
      feedbackId: inserted.id,
      uid,
      source,
      category,
      attachmentsCount: attrs.length,
    });

    return buildSuccess<FeedbackResultData>(
      {
        id: inserted.id,
        createdAt: inserted.createdAt.toISOString(),
      },
      'Feedback submitted successfully',
    );
  } catch (error) {
    logger.error('Error in handleCreateFeedback:', error);
    return buildError(
      ErrorCode.INTERNAL_SERVER_ERROR,
      'Internal server error',
    ) as ApiResponse<FeedbackResultData | null>;
  }
}
