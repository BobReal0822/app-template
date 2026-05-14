import { getTranslations } from 'next-intl/server';

import type { EmailLocale } from '@/server/email/locale';
import { escapeHtml } from '@/server/email/templates/_shared/escape';
import {
  EMAIL_STYLES,
  getBaseEmailTemplate,
  getEmailSiteBaseUrl,
} from '@/server/email/templates/base';

interface WelcomeTemplateParams {
  locale: EmailLocale;
  userName?: string;
}

export async function getWelcomeEmailTemplate(
  params: WelcomeTemplateParams,
): Promise<string> {
  const { locale, userName } = params;
  const t = await getTranslations({ locale, namespace: 'email' });
  const siteBaseUrl = getEmailSiteBaseUrl();
  const appUrl = `${siteBaseUrl}/app`;
  // No `/help` route on the marketing site; surface the existing /feedback
  // page as the contact entry point.
  const helpUrl = `${siteBaseUrl}/feedback`;
  const greeting = userName
    ? t('welcome.greetingNamed', { name: escapeHtml(userName) })
    : t('welcome.greetingFallback');

  const bulletStyle = `color:${EMAIL_STYLES.textColor}; font-size:15px; line-height:1.7;`;
  const linkStyle = `color:${EMAIL_STYLES.primaryColor}; text-decoration:underline;`;

  const content = `
    <h1>${t('welcome.title')}</h1>
    <p>${greeting}</p>
    <p>${t('welcome.intro')}</p>

    <ul style="${bulletStyle} padding-left:20px; margin:8px 0 24px;">
      <li>${t('welcome.bullets.urlToVideo')}</li>
      <li>${t('welcome.bullets.videoInsight')}</li>
      <li>${t('welcome.bullets.productVideo')}</li>
      <li>${t('welcome.bullets.productPhoto')}</li>
      <li>${t('welcome.bullets.generators')}</li>
    </ul>

    <div class="button-container" style="text-align:center;">
      <a href="${appUrl}" class="button" style="font-size:16px; padding:14px 30px; border-radius:10px;">${t('welcome.cta')}</a>
    </div>

    <p class="muted">${t('welcome.creditsNote')}</p>

    <hr class="divider" />

    <p class="muted">
      ${t('welcome.needHelpPrefix')}
      <a href="${helpUrl}" style="${linkStyle}">${t('welcome.helpCenter')}</a>${t('welcome.needHelpSuffix')}
    </p>
  `;

  return getBaseEmailTemplate(content, locale);
}
