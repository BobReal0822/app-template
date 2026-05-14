import { differenceInCalendarDays } from 'date-fns';

/**
 * Format duration in seconds as "m:ss".
 * @param seconds - Number of seconds (integer)
 * @returns e.g. "1:30", "0:00"
 */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || seconds < 0 || !Number.isFinite(seconds)) {
    return '0:00';
  }
  const s = Math.floor(seconds);
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Get the current year (e.g. for copyright display).
 */
export function getCurrentYear(): number {
  return new Date().getFullYear();
}

/**
 * Format date only (no time).
 * @param date - Date string or Date object
 * @param locale - Locale e.g. 'zh-CN', 'en-US'; uses browser default if omitted
 * @returns Formatted date string
 */
export function formatDate(date: string | Date, locale?: string): string {
  try {
    const d = typeof date === 'string' ? parseDateString(date) : date;
    if (isNaN(d.getTime())) {
      return locale === 'zh' ? '未知日期' : 'Unknown date';
    }
    return d.toLocaleDateString(locale ?? undefined, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    return typeof date === 'string' ? date : 'Unknown date';
  }
}

/**
 * Format date and time as a readable string.
 * @param dateString - Date string or Date object
 * @param locale - Locale ('zh' | 'en')
 * @returns Formatted datetime string, e.g. "12/27/2025, 11:15 PM" or "2025/12/27 23:15"
 */
export function formatDateTime(
  dateString: string | Date,
  locale?: string,
): string {
  try {
    let date: Date;
    if (typeof dateString === 'string') {
      date = parseDateString(dateString);
    } else {
      date = dateString;
    }

    if (isNaN(date.getTime())) {
      return locale === 'zh' ? '未知时间' : 'Unknown time';
    }

    if (locale === 'zh') {
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    }

    return date.toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return typeof dateString === 'string' ? dateString : 'Unknown time';
  }
}

/**
 * Format relative time (e.g. "5 minutes ago").
 * @param dateString - Date string or Date object (server often returns UTC string)
 * @param locale - Optional `'zh'` | `'en'`-style key for localized phrasing (default: English)
 * @returns Formatted relative time string
 */
export function formatRelativeTime(
  dateString: string | Date,
  locale?: string,
): string {
  return formatRelativeTimeInternal(dateString, false, locale);
}

/** Calendar days within which project cards show {@link formatRelativeTime} instead of a fixed date. */
const PROJECT_CARD_RELATIVE_THRESHOLD_DAYS = 7;

/**
 * Hybrid date for project cards: relative time within the last 7 calendar days
 * (via {@link formatRelativeTime}); otherwise a short absolute date (month + day, year if needed).
 * Uses the same parsing rules as {@link formatRelativeTime} (`parseDateString` for ISO strings).
 */
export function formatProjectCardDate(
  iso: string,
  locale: string,
  now: Date = new Date(),
): string {
  const date = typeof iso === 'string' ? parseDateString(iso) : iso;
  if (isNaN(date.getTime())) {
    return '';
  }

  const localeKey = locale.startsWith('zh') ? 'zh' : 'en';
  const daysSince = differenceInCalendarDays(now, date);

  if (daysSince >= 0 && daysSince < PROJECT_CARD_RELATIVE_THRESHOLD_DAYS) {
    return formatRelativeTimeInternal(iso, false, localeKey);
  }

  const sameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString(localeKey === 'zh' ? 'zh-CN' : 'en-US', {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}

/**
 * Format relative time with more natural phrasing (e.g. "About one month ago").
 * @param dateString - Date string or Date object (server often returns UTC string)
 * @returns Formatted relative time string
 */
export function formatRelativeTimeNatural(
  dateString: string | Date,
  locale?: string,
): string {
  return formatRelativeTimeInternal(dateString, true, locale);
}

/**
 * Parse a date string safely, handling timezone.
 * @param dateString - Date string
 * @returns Date object
 *
 * Supported formats:
 * - With timezone: '2024-01-01T12:00:00Z', '2024-01-01T12:00:00+08:00'
 * - Without timezone (treated as UTC): '2024-01-01', '2024-01-01 12:00:00', '2024-01-01T12:00:00'
 *
 * Server-returned date strings often lack timezone; browsers interpret them as local time.
 * This function appends 'Z' when missing so parsing is consistent as UTC.
 */
function parseDateString(dateString: string): Date {
  // Check if string already has timezone (Z, +HH:MM, -HH:MM at end)
  const hasTimezone =
    dateString.includes('Z') ||
    dateString.includes('+') ||
    /-\d{2}:\d{2}$/.test(dateString);

  if (hasTimezone) {
    return new Date(dateString);
  } else {
    // No timezone: treat as UTC (YYYY-MM-DD, YYYY-MM-DD HH:mm:ss, YYYY-MM-DDTHH:mm:ss)
    if (dateString.includes('T')) {
      return new Date(dateString + 'Z');
    } else if (dateString.includes(' ')) {
      return new Date(dateString.replace(' ', 'T') + 'Z');
    } else {
      return new Date(dateString + 'T00:00:00Z');
    }
  }
}

/**
 * Internal relative-time formatter.
 */
function formatRelativeTimeInternal(
  dateString: string | Date,
  natural: boolean,
  locale?: string,
): string {
  const now = new Date();

  // Parse server date string (assumed UTC)
  let date: Date;
  if (typeof dateString === 'string') {
    date = parseDateString(dateString);
  } else {
    date = dateString;
  }

  if (isNaN(date.getTime())) {
    return locale === 'zh' ? '未知时间' : 'Unknown time';
  }

  const diffInMs = now.getTime() - date.getTime();
  const diffInSeconds = Math.floor(diffInMs / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);
  const diffInWeeks = Math.floor(diffInDays / 7);

  const diffInMonths = Math.floor(diffInDays / 30.44);
  const diffInYears = Math.floor(diffInDays / 365.25);

  // Future
  if (diffInMs < 0) {
    if (diffInSeconds > -60) {
      return locale === 'zh' ? '刚刚' : 'Just now';
    }
    if (diffInMinutes > -60) {
      return locale === 'zh'
        ? `${Math.abs(diffInMinutes)} 分钟后`
        : `${Math.abs(diffInMinutes)} minutes later`;
    }
    if (diffInHours > -24) {
      return locale === 'zh'
        ? `${Math.abs(diffInHours)} 小时后`
        : `${Math.abs(diffInHours)} hours later`;
    }
    if (diffInDays > -7) {
      return locale === 'zh'
        ? `${Math.abs(diffInDays)} 天后`
        : `${Math.abs(diffInDays)} days later`;
    }
    return locale === 'zh' ? '未来时间' : 'Future time';
  }

  // Past
  if (diffInSeconds < 60) {
    return locale === 'zh' ? '刚刚' : 'Just now';
  }

  if (diffInMinutes < 60) {
    return locale === 'zh'
      ? `${diffInMinutes} 分钟前`
      : `${diffInMinutes} minutes ago`;
  }

  if (diffInHours < 24) {
    return locale === 'zh'
      ? `${diffInHours} 小时前`
      : `${diffInHours} hours ago`;
  }

  if (diffInDays < 7) {
    return locale === 'zh' ? `${diffInDays} 天前` : `${diffInDays} days ago`;
  }

  if (diffInWeeks < 4) {
    return locale === 'zh' ? `${diffInWeeks} 周前` : `${diffInWeeks} weeks ago`;
  }

  if (diffInMonths < 12) {
    if (natural) {
      if (diffInMonths === 1) {
        return locale === 'zh' ? '大约一个月前' : 'About one month ago';
      }
      return locale === 'zh'
        ? `大约 ${diffInMonths} 个月前`
        : `About ${diffInMonths} months ago`;
    }
    return locale === 'zh'
      ? `${diffInMonths} 个月前`
      : `${diffInMonths} months ago`;
  }

  if (diffInYears === 1) {
    return natural
      ? locale === 'zh'
        ? '大约一年前'
        : 'About one year ago'
      : locale === 'zh'
        ? '1 年前'
        : '1 year ago';
  }

  return natural
    ? locale === 'zh'
      ? `大约 ${diffInYears} 年前`
      : `About ${diffInYears} years ago`
    : locale === 'zh'
      ? `${diffInYears} 年前`
      : `${diffInYears} years ago`;
}
