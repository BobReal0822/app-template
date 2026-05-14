import { getTranslations } from 'next-intl/server';

import { sendEmail } from '@/server/email/client';
import type { EmailLocale } from '@/server/email/locale';
import { getWelcomeEmailTemplate } from '@/server/email/templates/welcome';

interface SendWelcomeEmailOptions {
  userName?: string;
  locale: EmailLocale;
}

export async function sendWelcomeEmail(
  email: string,
  options: SendWelcomeEmailOptions,
): Promise<{ success: boolean; messageId?: string }> {
  const { locale, userName } = options;
  const t = await getTranslations({ locale, namespace: 'email' });
  const html = await getWelcomeEmailTemplate({ locale, userName });

  return sendEmail({
    to: email,
    subject: t('welcome.subject'),
    html,
  });
}
