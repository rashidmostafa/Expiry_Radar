import { daysBetween, today } from './dates';
import type { PantryItem, Urgency } from './types';

export function daysLeft(item: Pick<PantryItem, 'expiresOn'>, now = today()) {
  return daysBetween(now, item.expiresOn);
}

/** Stitch color logic: coral for today/tomorrow, amber for the next few days, green beyond. */
export function urgencyFor(days: number): Urgency {
  if (days < 0) return 'expired';
  if (days <= 1) return 'urgent';
  if (days <= 4) return 'soon';
  return 'fresh';
}

export function itemUrgency(item: Pick<PantryItem, 'expiresOn'>, now = today()) {
  return urgencyFor(daysLeft(item, now));
}

export function needsAttention(item: Pick<PantryItem, 'expiresOn'>, now = today()) {
  const urgency = itemUrgency(item, now);
  return urgency !== 'fresh';
}

/** "1d left" / "12 days left" style countdown pill. */
export function shortCountdown(days: number) {
  if (days < 0) return 'Expired';
  if (days === 0) return 'Today';
  return `${days}d left`;
}

/** "12 days left" */
export function longCountdown(days: number) {
  if (days < 0) return `Expired ${-days}d ago`;
  if (days === 0) return 'Expires today';
  return `${days} ${days === 1 ? 'day' : 'days'} left`;
}

/** "Tomorrow" / "In 3 days" line under home cards. */
export function relativeExpiry(days: number) {
  if (days < -1) return `${-days} days ago`;
  if (days === -1) return 'Yesterday';
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `In ${days} days`;
}

/** "expires tomorrow" — for running copy like nudges. */
export function expiresPhrase(days: number) {
  if (days < 0) return 'already expired';
  if (days === 0) return 'expires today';
  if (days === 1) return 'expires tomorrow';
  return `expires in ${days} days`;
}

/** "Expires Tomorrow" / "Expires in 3 days" inventory badge. */
export function expiryBadge(days: number) {
  if (days < 0) return 'Expired';
  if (days === 0) return 'Expires Today';
  if (days === 1) return 'Expires Tomorrow';
  return `Expires in ${days} days`;
}

/** Sort: most urgent first, then name. */
export function byExpiry(a: PantryItem, b: PantryItem) {
  return a.expiresOn.localeCompare(b.expiresOn) || a.name.localeCompare(b.name);
}
