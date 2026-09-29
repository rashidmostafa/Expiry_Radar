import { addDays, daysBetween, formatShort, parseISODate, toISODate, today } from './dates';

/**
 * When an item's expiry nudge fires: `daysBefore` days ahead of expiry at `hour`.
 * If that moment has passed, the next `hour` slot is used; no nudge once it would land after expiry.
 */
export function nextAlertDate(expiresOn: string, daysBefore: number, hour: number, now = new Date()) {
  const fireOn = addDays(expiresOn, -daysBefore);
  const date = parseISODate(daysBetween(today(), fireOn) < 0 ? today() : fireOn);
  date.setHours(hour, 0, 0, 0);
  if (date.getTime() <= now.getTime()) date.setDate(date.getDate() + 1);
  return daysBetween(toISODate(date), expiresOn) < 0 ? undefined : date;
}

/** "8:00 AM Tomorrow", as on the Stitch item details alert row. */
export function describeAlert(expiresOn: string, daysBefore: number, hour: number) {
  const date = nextAlertDate(expiresOn, daysBefore, hour);
  if (!date) return undefined;
  const time = `${hour % 12 === 0 ? 12 : hour % 12}:00 ${hour < 12 ? 'AM' : 'PM'}`;
  const offset = daysBetween(today(), toISODate(date));
  const day = offset === 0 ? 'Today' : offset === 1 ? 'Tomorrow' : formatShort(toISODate(date));
  return `${time} ${day}`;
}

/** "24-Hour Expiry Alert" / "2-Day Expiry Alert". */
export function alertTitle(daysBefore: number) {
  return daysBefore === 1 ? '24-Hour Expiry Alert' : `${daysBefore}-Day Expiry Alert`;
}
