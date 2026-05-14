import { getTranslations } from 'next-intl/server';

import { getSiteOrigin } from '@/lib/site-url';
import type { EmailLocale } from '@/server/email/locale';
import { escapeHtml } from '@/server/email/templates/_shared/escape';

/**
 * Hex tokens aligned with `src/styles/global.css`'s light-mode design
 * tokens. Email clients have spotty support for CSS variables and color-mix,
 * so we resolve to literals at template build time.
 */
export const EMAIL_STYLES = {
  primaryColor: '#1c69e3', // --primary
  primaryForeground: '#ffffff', // --primary-foreground
  textColor: '#090b0f', // --foreground
  mutedColor: '#4f5661', // --muted-foreground
  backgroundColor: '#fdfdfd', // --background
  cardBackgroundColor: '#ffffff', // --card
  subtleBackgroundColor: '#f1f5fc', // --secondary
  // Soft primary tint (~6% of --primary on white). Email clients can't do
  // color-mix at runtime, so we resolve here. Drifts intentionally from
  // web's --accent (#e7edf6) toward a more brand-aligned hue for the OTP
  // highlight block.
  accentBackgroundColor: '#eef4fc',
  borderColor: '#e3e5e8', // --border
  fontStack:
    "'Geist Fallback', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  monoStack:
    "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace",
} as const;

const EMAIL_BRAND_LOGO_ASPECT_RATIO = 445 / 150;
const EMAIL_BRAND_LOGO_HEIGHT = 26;
const EMAIL_BRAND_LOGO_WIDTH = Math.round(
  EMAIL_BRAND_LOGO_HEIGHT * EMAIL_BRAND_LOGO_ASPECT_RATIO,
);

export function getEmailSiteBaseUrl(): string {
  return getSiteOrigin();
}

interface BaseEmailTemplateOptions {
  brandLogoUrl?: string;
  senderName?: string;
  senderAvatarUrl?: string;
}

function getSafeAssetUrl(input?: string, siteBaseUrl?: string): string | null {
  if (!input) {
    return null;
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return escapeHtml(trimmed);
  }

  if (siteBaseUrl && trimmed.startsWith('/')) {
    return escapeHtml(`${siteBaseUrl}${trimmed}`);
  }

  return null;
}

export async function getBaseEmailTemplate(
  content: string,
  locale: EmailLocale,
  options: BaseEmailTemplateOptions = {},
): Promise<string> {
  const t = await getTranslations({ locale, namespace: 'email.shared' });
  const siteBaseUrl = getEmailSiteBaseUrl();
  const homeUrl = siteBaseUrl;
  const homeLabel = (() => {
    try {
      return new URL(siteBaseUrl).hostname.replace(/^www\./, '');
    } catch {
      return siteBaseUrl;
    }
  })();
  const privacyUrl = `${siteBaseUrl}/privacy`;
  const year = new Date().getFullYear();
  const hasSenderMeta =
    options.senderAvatarUrl !== undefined || options.senderName !== undefined;
  const brandLogoUrl = getSafeAssetUrl(
    options.brandLogoUrl ?? '/logo/logo-light-v3.png',
    siteBaseUrl,
  );
  const senderAvatarUrl = getSafeAssetUrl(
    options.senderAvatarUrl ?? '/logo/icon-light-v6.png',
    siteBaseUrl,
  );
  const senderName = escapeHtml(
    (options.senderName ?? 'App Template Team').trim(),
  );
  const senderMeta = hasSenderMeta
    ? `
        <div style="margin: -12px 0 22px; color:${EMAIL_STYLES.mutedColor}; font-size:12px; line-height:1.4;">
          ${senderAvatarUrl ? `<img src="${senderAvatarUrl}" width="20" height="20" alt="" style="display:inline-block; width:20px; height:20px; border-radius:999px; vertical-align:middle; margin-right:8px;" />` : ''}
          ${senderName ? `<span style="vertical-align:middle;">${senderName}</span>` : ''}
        </div>
      `
    : '';

  return `
<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${t('brand')}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: ${EMAIL_STYLES.backgroundColor};
      font-family: ${EMAIL_STYLES.fontStack};
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    .email-container { max-width: 560px; margin: 0 auto; padding: 32px 20px; }
    .email-card {
      background-color: ${EMAIL_STYLES.cardBackgroundColor};
      border: 1px solid ${EMAIL_STYLES.borderColor};
      border-radius: 12px;
      overflow: hidden;
    }
    .brand-bar {
      height: 4px;
      line-height: 4px;
      font-size: 0;
      mso-line-height-rule: exactly;
      background-color: ${EMAIL_STYLES.primaryColor};
    }
    .email-body { padding: 36px 36px 32px; }
    .logo { margin: 0 0 28px; }
    .logo a {
      display: inline-block;
      font-size: 20px;
      font-weight: 700;
      letter-spacing: -0.01em;
      color: ${EMAIL_STYLES.primaryColor};
      text-decoration: none;
    }
    h1 {
      color: ${EMAIL_STYLES.textColor};
      font-size: 22px;
      font-weight: 600;
      line-height: 1.3;
      margin: 0 0 16px;
      letter-spacing: -0.01em;
    }
    p {
      color: ${EMAIL_STYLES.textColor};
      font-size: 15px;
      line-height: 1.6;
      margin: 0 0 16px;
    }
    .muted { color: ${EMAIL_STYLES.mutedColor}; font-size: 13px; line-height: 1.6; }
    .button-container { margin: 32px 0 28px; text-align: center; }
    .button {
      display: inline-block;
      background-color: ${EMAIL_STYLES.primaryColor};
      color: ${EMAIL_STYLES.primaryForeground} !important;
      font-size: 15px;
      font-weight: 600;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 8px;
    }
    .divider {
      border: none;
      border-top: 1px solid ${EMAIL_STYLES.borderColor};
      margin: 28px 0 20px;
    }
    .footer {
      text-align: center;
      padding: 20px 0 4px;
      color: ${EMAIL_STYLES.mutedColor};
      font-size: 12px;
      line-height: 1.6;
    }
    .footer a {
      color: ${EMAIL_STYLES.mutedColor};
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-card">
      <div class="brand-bar" style="height:4px; line-height:4px; font-size:0; mso-line-height-rule:exactly; background-color:${EMAIL_STYLES.primaryColor};">&nbsp;</div>
      <div class="email-body">
        <div class="logo">
          <a href="${siteBaseUrl}" aria-label="${t('brand')}" style="display:inline-block; color:${EMAIL_STYLES.primaryColor}; text-decoration:none;">
            ${brandLogoUrl ? `<img src="${brandLogoUrl}" width="${EMAIL_BRAND_LOGO_WIDTH}" height="${EMAIL_BRAND_LOGO_HEIGHT}" alt="${t('brand')}" style="display:block; width:${EMAIL_BRAND_LOGO_WIDTH}px; height:${EMAIL_BRAND_LOGO_HEIGHT}px; border:0; outline:none; text-decoration:none;" />` : `<span style="display:inline-block; font-size:20px; font-weight:700; letter-spacing:-0.01em; line-height:1.2; color:${EMAIL_STYLES.primaryColor};">${t('brand')}</span>`}
          </a>
        </div>
        ${senderMeta}
        ${content}
      </div>
    </div>
    <div class="footer">
      ${t('copyright', { year })} · <a href="${homeUrl}">${homeLabel}</a> · <a href="${privacyUrl}">${t('privacyPolicy')}</a>
    </div>
  </div>
</body>
</html>
  `.trim();
}
