import { Resend } from 'resend';

import * as logger from '@/server/lib/logger';

let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY?.trim();
    if (!apiKey) {
      throw new Error('RESEND_API_KEY is not configured');
    }
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

const DEFAULT_FROM =
  process.env.EMAIL_FROM || 'App Template <noreply@example.com>';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
}

export async function sendEmail(
  options: SendEmailOptions,
): Promise<SendEmailResult> {
  const { to, subject, html, from = DEFAULT_FROM, replyTo } = options;

  try {
    const resend = getResendClient();
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject,
      html,
      replyTo,
    });

    if (error) {
      logger.error('[email] send failed', {
        to,
        subject,
        resendError: error,
      });
      return { success: false };
    }

    return {
      success: true,
      messageId: data?.id,
    };
  } catch (error) {
    logger.error('[email] send threw', {
      to,
      subject,
      error,
    });
    return { success: false };
  }
}
