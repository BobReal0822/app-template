/**
 * Vercel Queues consumer: `email-notification`
 *
 * Generic Resend wrapper for any "send this email asynchronously" need —
 * a primary caller is the long-task watchdog ("your gen-video has been
 * processing for 10+ minutes").
 *
 * The route is **private** (no public URL); the trigger is wired via
 * `experimentalTriggers` in `vercel.json`. Templating happens in the
 * producer; this consumer just speaks Resend.
 *
 * Idempotency: keyed on `meta.messageId` via `withIdempotency`. If the
 * producer wants to dedup at the recipient/event level (e.g. "only one
 * watchdog email per gen-task per hour"), pass an explicit
 * `idempotencyKey` to `enqueue()` — Vercel Queues' built-in dedup window
 * (≤ 24h) is the right tool there.
 */

import { handleCallback } from '@vercel/queue';

import { sendEmail } from '@/server/email';
import { withIdempotency } from '@/server/lib/idempotency';
import * as logger from '@/server/lib/logger';
import type { EmailNotificationPayload } from '@/server/queue/enqueue';

export const runtime = 'nodejs';

const handleEmailNotification = handleCallback<EmailNotificationPayload>(
  async (payload, meta) => {
    await withIdempotency(
      `queue:email-notification:${meta.messageId}`,
      'queue:email-notification',
      async () => {
        const result = await sendEmail({
          to: payload.to,
          subject: payload.subject,
          html: payload.html,
          from: payload.from,
          replyTo: payload.replyTo,
        });

        if (!result.success) {
          // Throw so Vercel Queues retries — Resend transient failures
          // should not silently drop the message. Permanent failures
          // (invalid recipient etc.) will eventually exhaust retries
          // and fall into the implicit DLQ → Sentry.
          throw new Error('[Queue:email-notification] Resend failed');
        }

        logger.info('[Queue:email-notification] sent', {
          to: payload.to,
          subject: payload.subject,
          messageId: result.messageId,
        });
      },
    );
  },
);

/** Next.js 15 validates Route Handler signatures; wrap `handleCallback` return type. */
export async function POST(request: Request) {
  return handleEmailNotification(request);
}
