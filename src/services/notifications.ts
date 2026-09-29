import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { nextAlertDate } from '@/domain/alerts';
import { addDays, daysBetween, parseISODate, toISODate, today } from '@/domain/dates';
import { expiresPhrase } from '@/domain/expiry';
import { findFood } from '@/domain/foods';
import type { PantryItem } from '@/domain/types';
import { recipesUsing } from '@/data/recipes';
import { getSettings, inQuietHours } from '@/store/settings';

/**
 * Local notifications (work offline and in Expo Go):
 * - one expiry nudge per item, `alertDaysBefore` days ahead at `alertHour`
 * - a morning digest and an evening cook nudge on days something needs using (next 7 days)
 * - a Sunday-evening weekly report reminder
 * Everything respects quiet hours. Tapping opens the `href` in the notification data.
 */
const supported = Platform.OS === 'ios' || Platform.OS === 'android';
const CHANNEL = 'expiry-nudges';

let permission: Promise<boolean> | undefined;

export function configureNotifications() {
  if (!supported) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

async function ensurePermission() {
  permission ??= (async () => {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL, {
        name: 'Expiry nudges',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    const requested = await Notifications.requestPermissionsAsync();
    return requested.granted;
  })();
  return permission;
}

/** Moves a time that lands in quiet hours to the moment they end. */
function outsideQuietHours(date: Date) {
  const { quietHours } = getSettings();
  if (!inQuietHours(date, quietHours)) return date;
  const shifted = new Date(date);
  shifted.setHours(Math.floor(quietHours.to / 60), quietHours.to % 60, 0, 0);
  if (shifted <= date) shifted.setDate(shifted.getDate() + 1);
  return shifted;
}

async function schedule(identifier: string, date: Date, content: Notifications.NotificationContentInput) {
  await Notifications.scheduleNotificationAsync({
    identifier,
    content,
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: CHANNEL },
  });
}

const nudgeId = (itemId: string) => `expiry-${itemId}`;

function shortName(item: PantryItem) {
  return item.name.replace(/\s*\(.*\)$/, '');
}

function nudgeCopy(item: PantryItem, daysAhead: number) {
  const food = findFood(item.name);
  const ideas = food ? recipesUsing(food.key).length : 0;
  return {
    title: `Your ${shortName(item).toLowerCase()} ${expiresPhrase(daysAhead)} 🌱`,
    body:
      ideas > 0
        ? `Here ${ideas === 1 ? 'is 1 quick idea' : `are ${ideas} quick ideas`} to enjoy it before it spoils.`
        : 'A little plan now saves it from the bin. Tap to see options.',
  };
}

export async function scheduleExpiryNudge(item: PantryItem) {
  if (!supported) return;
  try {
    const { alertDaysBefore, alertHour, nudgeTypes } = getSettings();
    await Notifications.cancelScheduledNotificationAsync(nudgeId(item.id));
    const planned = nudgeTypes.expiry ? nextAlertDate(item.expiresOn, alertDaysBefore, alertHour) : undefined;
    if (!planned) return;
    const date = outsideQuietHours(planned);
    if (daysBetween(toISODate(date), item.expiresOn) < 0) return;
    if (!(await ensurePermission())) return;
    await schedule(nudgeId(item.id), date, {
      ...nudgeCopy(item, daysBetween(toISODate(date), item.expiresOn)),
      data: { href: `/item/${item.id}` },
    });
  } catch (error) {
    console.warn('Could not schedule expiry nudge', error);
  }
}

export async function cancelExpiryNudge(itemId: string) {
  if (!supported) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(nudgeId(itemId));
  } catch {
    // Nothing scheduled.
  }
}

const PLAN_DAYS = 7;
const EVENING = 17 * 60 + 30;

/**
 * Re-plans the digest, evening and weekly notifications from the current pantry.
 * Content is computed now from expiry dates, which don't change unless the pantry does —
 * and every pantry change calls this again.
 */
export async function planDigests(items: PantryItem[]) {
  if (!supported) return;
  try {
    const { digestAt, eveningNudge, nudgeTypes } = getSettings();
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled
        .filter((request) => /^(digest|evening|weekly)-/.test(request.identifier))
        .map((request) => Notifications.cancelScheduledNotificationAsync(request.identifier))
    );

    const active = items.filter((item) => item.status === 'active');
    const jobs: [string, Date, Notifications.NotificationContentInput][] = [];
    const now = Date.now();

    for (let offset = 0; offset < PLAN_DAYS; offset++) {
      const day = addDays(today(), offset);
      const due = active.filter((item) => {
        const left = daysBetween(day, item.expiresOn);
        return left >= 0 && left <= 1;
      });
      if (due.length === 0) continue;
      const names = due.slice(0, 2).map(shortName).join(' and ');

      if (digestAt !== null) {
        const at = parseISODate(day);
        at.setHours(Math.floor(digestAt / 60), digestAt % 60, 0, 0);
        const date = outsideQuietHours(at);
        if (date.getTime() > now) {
          jobs.push([
            `digest-${day}`,
            date,
            {
              title: 'Your morning freshness digest ☀️',
              body: `${due.length} ${due.length === 1 ? 'item needs' : 'items need'} using today: ${names}${due.length > 2 ? ' and more' : ''}.`,
              data: { href: '/digest' },
            },
          ]);
        }
      }
      if (eveningNudge && nudgeTypes.recipes) {
        const at = parseISODate(day);
        at.setHours(Math.floor(EVENING / 60), EVENING % 60, 0, 0);
        const date = outsideQuietHours(at);
        if (date.getTime() > now) {
          jobs.push([
            `evening-${day}`,
            date,
            {
              title: 'Dinner idea that saves food 🍳',
              body: `Your ${names.toLowerCase()} would be perfect tonight. Tap for recipes that use ${due.length === 1 ? 'it' : 'them'}.`,
              data: { href: '/recipes' },
            },
          ]);
        }
      }
    }

    if (nudgeTypes.weekly) {
      const sunday = new Date();
      sunday.setDate(sunday.getDate() + ((7 - sunday.getDay()) % 7));
      sunday.setHours(18, 0, 0, 0);
      if (sunday.getTime() <= now) sunday.setDate(sunday.getDate() + 7);
      jobs.push([
        `weekly-${toISODate(sunday)}`,
        outsideQuietHours(sunday),
        { title: 'Your weekly waste report is ready 📊', body: 'See what you saved this week and where the radar can help next.', data: { href: '/insights' } },
      ]);
    }

    if (jobs.length === 0 || !(await ensurePermission())) return;
    await Promise.all(jobs.map(([id, date, content]) => schedule(id, date, content)));
  } catch (error) {
    console.warn('Could not plan digests', error);
  }
}

/** Opens the screen a notification points to. Returns an unsubscribe function. */
export function onNotificationOpened(open: (href: string) => void) {
  if (!supported) return () => {};
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data;
    if (typeof data?.href === 'string') open(data.href);
    // Nudges scheduled by the first release carried only an item id.
    else if (typeof data?.itemId === 'string') open(`/item/${data.itemId}`);
  });
  return () => subscription.remove();
}
