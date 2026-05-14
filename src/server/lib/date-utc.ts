/** UTC calendar helpers for billing grant schedules (anniversary months, YYYY-MM keys). */

export function addUtcMonths(
  base: Date,
  months: number,
  anchorDay: number = base.getUTCDate(),
): Date {
  const result = new Date(
    Date.UTC(
      base.getUTCFullYear(),
      base.getUTCMonth() + months,
      1,
      base.getUTCHours(),
      base.getUTCMinutes(),
      base.getUTCSeconds(),
      base.getUTCMilliseconds(),
    ),
  );
  const daysInTargetMonth = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const normalizedAnchor = Math.min(Math.max(Math.trunc(anchorDay), 1), 31);
  result.setUTCDate(Math.min(normalizedAnchor, daysInTargetMonth));
  return result;
}

export function formatGrantMonthUtc(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}
