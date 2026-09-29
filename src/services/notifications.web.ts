import type { PantryItem } from '@/domain/types';

/** Web preview: scheduled local notifications aren't supported, so nudges are no-ops. */
export function configureNotifications() {}

export async function scheduleExpiryNudge(_item: PantryItem) {}

export async function cancelExpiryNudge(_itemId: string) {}

export function onNudgeOpened(_open: (itemId: string) => void) {
  return () => {};
}
