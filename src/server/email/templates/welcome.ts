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

  const linkStyle = `color:${EMAIL_STYLES.primaryColor}; text-decoration:underline;`;

  const content = `
    <h1>${t('welcome.title')}</h1>
    <p>${greeting}</p>
    <p>${t('welcome.intro')}</p>

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
