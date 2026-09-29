/** Calendar-date helpers. Dates are stored as local `yyyy-mm-dd` strings so "tomorrow" never drifts with time zones. */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_MS = 86_400_000;

export function toISODate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseISODate(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function today() {
  return toISODate(new Date());
}

export function addDays(iso: string, days: number) {
  const date = parseISODate(iso);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

/** Whole calendar days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: string, to: string) {
  return Math.round((parseISODate(to).getTime() - parseISODate(from).getTime()) / DAY_MS);
}

/** "Oct 24" */
export function formatShort(iso: string) {
  const date = parseISODate(iso);
  return `${MONTHS[date.getMonth()]} ${date.getDate()}`;
}

/** "Oct 31, 2024" */
export function formatLong(iso: string) {
  const date = parseISODate(iso);
  return `${formatShort(iso)}, ${date.getFullYear()}`;
}

/** "Today, Oct 24" / "Yesterday, Oct 23" / "Oct 20" — Stitch's purchased-date field. */
export function formatRelativeDay(iso: string, now = today()) {
  const diff = daysBetween(now, iso);
  if (diff === 0) return `Today, ${formatShort(iso)}`;
  if (diff === -1) return `Yesterday, ${formatShort(iso)}`;
  if (diff === 1) return `Tomorrow, ${formatShort(iso)}`;
  return formatLong(iso);
}

export function greeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}
