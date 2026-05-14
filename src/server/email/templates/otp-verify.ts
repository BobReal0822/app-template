import { getTranslations } from 'next-intl/server';

import type { EmailLocale } from '@/server/email/locale';
import { getOtpBlock } from '@/server/email/templates/_shared/otp-block';
import { getBaseEmailTemplate } from '@/server/email/templates/base';

interface OtpVerifyTemplateParams {
  otp: string;
  expiresMinutes: number;
  locale: EmailLocale;
}

export async function getOtpVerifyEmailTemplate(
  params: OtpVerifyTemplateParams,
): Promise<string> {
  const { otp, expiresMinutes, locale } = params;
  const t = await getTranslations({ locale, namespace: 'email' });

  const content = `
    <h1>${t('otpVerify.title')}</h1>
    <p>${t('otpVerify.intro')}</p>
    ${getOtpBlock(otp, t('otpBlock.expires', { minutes: expiresMinutes }))}
    <hr class="divider" />
    <p class="muted">${t('otpVerify.securityNote')}</p>
  `;

  return getBaseEmailTemplate(content, locale);
}
