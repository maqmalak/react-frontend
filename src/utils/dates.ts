/** Date formatting utilities. ERPNext stores dates as `YYYY-MM-DD` (Datetime as `YYYY-MM-DD HH:MM:SS`). */

export function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDate(value?: string | null, opts?: Intl.DateTimeFormatOptions): string {
  const d = parseDate(value);
  if (!d) return "—";
  return d.toLocaleDateString("en-US", opts ?? { year: "numeric", month: "short", day: "numeric" });
}

export function formatShortDate(value?: string | null): string {
  const d = parseDate(value);
  if (!d) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatDateTime(value?: string | null): string {
  if (!value) return "—";
  // ERPNext returns "2026-01-01 10:00:00.000000" or ISO. Normalize the space.
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const d = parseDate(normalized);
  if (!d) return value;
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** ISO date string for ERPNext (YYYY-MM-DD). */
export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

/**
 * The earlier of a given ISO date and today — clamps a fiscal year's own end
 * date (which may fall in the future) so period-based reports don't request
 * data for months that haven't happened yet.
 */
export function clampToToday(date?: string | null): string | undefined {
  if (!date) return undefined;
  const today = todayISO();
  return date < today ? date : today;
}

/** Human "x days ago" / "in x days". */
export function relativeDays(value?: string | null): string {
  const d = parseDate(value);
  if (!d) return "";
  const diff = Math.round((d.getTime() - Date.now()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff > 0) return `in ${diff} days`;
  return `${Math.abs(diff)} days ago`;
}

/** Days remaining until a date (negative if past). */
export function daysUntil(value?: string | null): number | null {
  const d = parseDate(value);
  if (!d) return null;
  return Math.round((d.getTime() - Date.now()) / 86_400_000);
}