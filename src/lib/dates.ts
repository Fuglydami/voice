/** Date helpers. All article timestamps are stored as ISO 8601 UTC strings. */

/** `YYYY-MM-DD` for today, in the viewer's local zone. */
export function today(): string {
  return toDateInput(new Date());
}

/** `Date` → `YYYY-MM-DD`, suitable for `<input type="date">`. */
export function toDateInput(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** `YYYY-MM-DD` N days before today. */
export function daysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return toDateInput(date);
}

/**
 * The byline timestamp from the mockup: `"10:00 AM, Today"`, degrading to
 * `"10:00 AM, Yesterday"` and then to `"10:00 AM, 4 Aug"`.
 *
 * `timeZone: "UTC"` is passed deliberately — the server and the client must
 * produce byte-identical output or React reports a hydration mismatch.
 */
export function formatByline(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const time = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  }).format(date);

  const days = wholeDaysAgoUtc(date);
  if (days === 0) return `${time}, Today`;
  if (days === 1) return `${time}, Yesterday`;

  const day = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    ...(days > 300 ? { year: "numeric" } : {}),
  }).format(date);

  return `${time}, ${day}`;
}

/** Whole days between `date` and now, both truncated to UTC midnight. */
function wholeDaysAgoUtc(date: Date): number {
  const startOf = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return Math.floor((startOf(new Date()) - startOf(date)) / 86_400_000);
}

/**
 * Compact elapsed time: `"14m"`, `"3h"`, `"2d"`. For narrow columns where the
 * full `formatByline` output would be clipped mid-string.
 */
export function formatElapsed(iso: string, now: number = Date.now()): string {
  const timestamp = Date.parse(iso);
  if (Number.isNaN(timestamp)) return "";

  const minutes = Math.max(0, Math.floor((now - timestamp) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;

  return `${Math.floor(days / 7)}w`;
}

/** Inclusive date-range test against an ISO timestamp. */
export function withinRange(iso: string, from?: string, to?: string): boolean {
  const day = iso.slice(0, 10);
  if (from && day < from) return false;
  if (to && day > to) return false;
  return true;
}
