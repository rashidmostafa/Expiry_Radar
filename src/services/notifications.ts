import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { nextAlertDate } from '@/domain/alerts';
import { daysBetween, toISODate } from '@/domain/dates';
import { expiresPhrase } from '@/domain/expiry';
import { findFood } from '@/domain/foods';
import type { PantryItem } from '@/domain/types';
import { recipesUsing } from '@/data/recipes';
import { getSettings } from '@/store/settings';

/**
 * Local "smart nudges": one scheduled notification per tracked item, delivered
 * `alertDaysBefore` days ahead of expiry at `alertHour`. Works offline and in Expo Go.
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

const nudgeId = (itemId: string) => `expiry-${itemId}`;

function nudgeCopy(item: PantryItem, daysAhead: number) {
  const name = item.name.replace(/\s*\(.*\)$/, '');
  const food = findFood(item.name);
  const ideas = food ? recipesUsing(food.key).length : 0;
  return {
    title: `Your ${name.toLowerCase()} ${expiresPhrase(daysAhead)} 🌱`,
    body:
      ideas > 0
        ? `Here ${ideas === 1 ? 'is 1 quick idea' : `are ${ideas} quick ideas`} to enjoy it before it spoils.`
        : 'A little plan now saves it from the bin. Tap to see options.',
  };
}

export async function scheduleExpiryNudge(item: PantryItem) {
  if (!supported) return;
  try {
    const { alertDaysBefore, alertHour } = getSettings();
    const date = nextAlertDate(item.expiresOn, alertDaysBefore, alertHour);
    await Notifications.cancelScheduledNotificationAsync(nudgeId(item.id));
    if (!date) return;
    if (!(await ensurePermission())) return;
    await Notifications.scheduleNotificationAsync({
      identifier: nudgeId(item.id),
      content: { ...nudgeCopy(item, daysBetween(toISODate(date), item.expiresOn)), data: { itemId: item.id } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: CHANNEL },
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

/** Opens the item a nudge was about. Returns an unsubscribe function. */
export function onNudgeOpened(open: (itemId: string) => void) {
  if (!supported) return () => {};
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const itemId = response.notification.request.content.data?.itemId;
    if (typeof itemId === 'string') open(itemId);
  });
  return () => subscription.remove();
}

