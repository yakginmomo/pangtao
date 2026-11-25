/**
 * Calendar-date helpers (BR-10). The product's "today" is always a Bangkok calendar
 * day (system-sds §5: APP_TIMEZONE=Asia/Bangkok), never the server's local timezone.
 */

export const DEFAULT_TIME_ZONE = process.env.APP_TIMEZONE || 'Asia/Bangkok';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** The calendar date (`YYYY-MM-DD`) of `now` in `timeZone`. */
export function todayInTimeZone(
  timeZone: string = DEFAULT_TIME_ZONE,
  now: Date = new Date()
): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const value = (type: 'year' | 'month' | 'day') =>
    parts.find((part) => part.type === type)?.value ?? '';
  return `${value('year')}-${value('month')}-${value('day')}`;
}

/**
 * True when `date` (`YYYY-MM-DD`) is strictly after today in `timeZone`.
 * Both operands are zero-padded ISO dates, so a string comparison is chronological.
 */
export function isFutureDate(
  date: string,
  timeZone: string = DEFAULT_TIME_ZONE,
  now: Date = new Date()
): boolean {
  return date > todayInTimeZone(timeZone, now);
}

/**
 * BR-10 (SRS v2.0, f-05/f-06 1.3): a Payment or Receipt may be dated at most this many
 * calendar days before today. A code constant, not configuration, so every instance
 * enforces the same rule. Opening balances (F-04) are not limited.
 */
export const BACKDATE_LIMIT_DAYS = 90;

/** The earliest accepted Payment/Receipt date: today in `timeZone` minus BACKDATE_LIMIT_DAYS. */
export function oldestAllowedDate(
  timeZone: string = DEFAULT_TIME_ZONE,
  now: Date = new Date()
): string {
  const [year, month, day] = todayInTimeZone(timeZone, now).split('-').map(Number);
  // Calendar-day arithmetic on a UTC date, so the result never depends on the server's zone.
  return new Date(Date.UTC(year, month - 1, day - BACKDATE_LIMIT_DAYS)).toISOString().slice(0, 10);
}

/** True when `date` (`YYYY-MM-DD`) is before oldestAllowedDate: T−90 is false, T−91 is true. */
export function isBeforeBackdateLimit(
  date: string,
  timeZone: string = DEFAULT_TIME_ZONE,
  now: Date = new Date()
): boolean {
  return date < oldestAllowedDate(timeZone, now);
}

/**
 * The first and last calendar day of the month containing `now` in `timeZone`
 * (f-08 §2.1, AC-08.8). `to` is the month's last day, not today, so a request
 * without bounds covers the whole current month.
 */
export function currentMonthRange(
  timeZone: string = DEFAULT_TIME_ZONE,
  now: Date = new Date()
): { from: string; to: string } {
  const today = todayInTimeZone(timeZone, now);
  const [year, month] = today.split('-').map(Number);
  // Day 0 of the following month is the last day of this one (handles leap years).
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const pad = (value: number) => String(value).padStart(2, '0');
  return {
    from: `${year}-${pad(month)}-01`,
    to: `${year}-${pad(month)}-${pad(lastDay)}`,
  };
}

/** True only for a real calendar day: `2026-02-30` and `2026-13-01` are rejected. */
export function isRealCalendarDate(date: string): boolean {
  if (!DATE_PATTERN.test(date)) return false;
  const [year, month, day] = date.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}
