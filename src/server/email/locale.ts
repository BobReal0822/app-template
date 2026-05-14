import { cookies, headers } from 'next/headers';

import { LOCALE_COOKIE_NAME } from '@/i18n/routing';

export type EmailLocale = 'en' | 'zh';

const DEFAULT_EMAIL_LOCALE: EmailLocale = 'en';

function tryMatchLocale(input: string): EmailLocale | null {
  const normalized = input.trim().toLowerCase().replace('_', '-');
  if (normalized === 'zh' || normalized.startsWith('zh-')) return 'zh';
  if (normalized === 'en' || normalized.startsWith('en-')) return 'en';
  return null;
}

/**
 * Pick the highest-q candidate from an `Accept-Language` header that
 * matches a supported locale. Returns null when no candidate matches —
 * the caller decides what to fall back to.
 */
function localeFromAcceptLanguage(
  header: string | null | undefined,
): EmailLocale | null {
  if (!header) return null;

  const candidates = header
    .split(',')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) => {
      const [lang, ...params] = segment.split(';').map((part) => part.trim());
      const qParam = params.find((part) => part.startsWith('q='));
      const q = qParam ? Number.parseFloat(qParam.slice(2)) : 1;
      return { lang, q: Number.isFinite(q) ? q : 0 };
    })
    .sort((a, b) => b.q - a.q);

  for (const { lang } of candidates) {
    const match = tryMatchLocale(lang);
    if (match) return match;
  }

  return null;
}

/**
 * Resolve the email locale for the current request.
 *
 * Source priority:
 *   1. Locale cookie (`LOCALE_COOKIE_NAME`) — what the user selected on site.
 *   2. `Accept-Language` header — browser/system preference, used only
 *      when the cookie is missing (e.g. OAuth callback before the user
 *      has hit a localized route).
 *   3. `'en'` default.
 *
 * `next/headers` throws outside a request scope (cron, scripts), so we
 * swallow and fall back to the default — emails sent from background
 * jobs that don't carry a locale should pass it explicitly via payload.
 */
export async function emailLocaleFromRequest(): Promise<EmailLocale> {
  try {
    const cookieStore = await cookies();
    const cookieMatch = tryMatchLocale(
      cookieStore.get(LOCALE_COOKIE_NAME)?.value ?? '',
    );
    if (cookieMatch) return cookieMatch;

    const requestHeaders = await headers();
    const headerMatch = localeFromAcceptLanguage(
      requestHeaders.get('accept-language'),
    );
    if (headerMatch) return headerMatch;

    return DEFAULT_EMAIL_LOCALE;
  } catch {
    return DEFAULT_EMAIL_LOCALE;
  }
}
