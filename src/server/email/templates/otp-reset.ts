import { getTranslations } from 'next-intl/server';

import type { EmailLocale } from '@/server/email/locale';
import { getOtpBlock } from '@/server/email/templates/_shared/otp-block';
import { getBaseEmailTemplate } from '@/server/email/templates/base';

interface OtpResetTemplateParams {
  otp: string;
  expiresMinutes: number;
  locale: EmailLocale;
}

export async function getOtpResetEmailTemplate(
  params: OtpResetTemplateParams,
): Promise<string> {
  const { otp, expiresMinutes, locale } = params;
  const t = await getTranslations({ locale, namespace: 'email' });

  const content = `
    <h1>${t('otpReset.title')}</h1>
    <p>${t('otpReset.intro')}</p>
    ${getOtpBlock(otp, t('otpBlock.expires', { minutes: expiresMinutes }))}
    <hr class="divider" />
    <p class="muted">${t('otpReset.securityNote')}</p>
  `;

  return getBaseEmailTemplate(content, locale);
}
