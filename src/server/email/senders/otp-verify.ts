import { getTranslations } from 'next-intl/server';

import { AUTH_RUNTIME } from '@/server/config/runtime';
import { sendEmail } from '@/server/email/client';
import type { EmailLocale } from '@/server/email/locale';
import { getOtpVerifyEmailTemplate } from '@/server/email/templates/otp-verify';

export async function sendVerificationOtpEmail(
  email: string,
  otp: string,
  locale: EmailLocale,
): Promise<void> {
  const expiresMinutes = Math.round(AUTH_RUNTIME.OTP_EXPIRES_SECONDS / 60);
  const html = await getOtpVerifyEmailTemplate({
    otp,
    expiresMinutes,
    locale,
  });
  const t = await getTranslations({ locale, namespace: 'email' });
  const result = await sendEmail({
    to: email,
    subject: t('otpVerify.subject'),
    html,
  });

  if (!result.success) {
    throw new Error('Failed to send verification OTP email');
  }
}
