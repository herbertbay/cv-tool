/**
 * Parse API date/datetime strings for display in the user's local timezone.
 * - Date-only (YYYY-MM-DD): parsed as local date so the calendar day is correct.
 * - DateTime without timezone (e.g. server UTC "YYYY-MM-DD HH:MM:SS"): treated as UTC, then displayed in local.
 */
export function parseDisplayDate(dateStr: string | null | undefined): Date | null {
  if (dateStr == null || typeof dateStr !== 'string') return null;
  const s = dateStr.trim();
  if (!s) return null;

  // Date-only (e.g. application_date): parse as local date to avoid UTC-midnight shifting the day
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/;
  const m = s.match(dateOnlyMatch);
  if (m) {
    const y = parseInt(m[1], 10);
    const mon = parseInt(m[2], 10) - 1;
    const d = parseInt(m[3], 10);
    const date = new Date(y, mon, d);
    return isNaN(date.getTime()) ? null : date;
  }

  // DateTime: backend often sends UTC without "Z" (e.g. "2025-03-18 14:30:00"). Treat as UTC so display in local is correct.
  let toParse = s;
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{1,2}:\d{2}/.test(s) && !/[Z+-]\d{2}:?\d{2}$/.test(s)) {
    toParse = s.replace(' ', 'T') + 'Z';
  }
  const date = new Date(toParse);
  return isNaN(date.getTime()) ? null : date;
}

export type FormatDateOptions = {
  /** If true, show relative time for recent dates (e.g. "2 hours ago"). */
  relative?: boolean;
  /** Include time in output when showing absolute date/time. */
  includeTime?: boolean;
};

/**
 * Format a date/datetime string for display in the user's local timezone and locale.
 */
export function formatDate(
  dateStr: string | null | undefined,
  options: FormatDateOptions = {}
): string {
  const d = parseDisplayDate(dateStr);
  if (!d) return dateStr ?? '—';

  const { relative = false, includeTime = false } = options;
  const now = new Date();

  if (relative) {
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60_000);
    const diffHours = Math.floor(diffMs / 3_600_000);
    const diffDays = Math.floor(diffMs / 86_400_000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
    if (diffHours < 24 && now.getDate() === d.getDate() && now.getMonth() === d.getMonth() && now.getFullYear() === d.getFullYear()) {
      return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    }
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.getDate() === yesterday.getDate() && d.getMonth() === yesterday.getMonth() && d.getFullYear() === yesterday.getFullYear()) {
      return 'yesterday';
    }
    if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) === 1 ? '' : 's'} ago`;
  }

  if (includeTime) {
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}
