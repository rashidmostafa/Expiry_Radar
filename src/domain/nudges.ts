import type { Settings } from '@/store/settings';

import { daysBetween, today } from './dates';
import { daysLeft } from './expiry';
import { findFood, shelfLifeFor } from './foods';
import { totals, within } from './insights';
import type { RecipeMatch } from './recipe-match';
import type { ItemEvent, PantryItem } from './types';

/**
 * Smart nudges: small, positive, actionable cards derived from the pantry and ledger.
 * Ids are stable per situation so dismissals and snoozes stick.
 */
export type Nudge =
  | { kind: 'expiry'; id: string; section: 'today'; item: PantryItem; days: number; recipes: RecipeMatch[] }
  | { kind: 'duplicate'; id: string; section: 'today'; older: PantryItem; newer: PantryItem }
  | { kind: 'freeze'; id: string; section: 'today'; item: PantryItem; days: number; freezerDays: number }
  | { kind: 'restock'; id: string; section: 'week'; item: PantryItem }
  | { kind: 'win'; id: string; section: 'week'; savedCents: number; co2Kg: number; tossed: number; names: string[] }
  | { kind: 'milestone'; id: string; section: 'week'; streak: number };

export type NudgeFilter = 'all' | 'urgent' | 'duplicate' | 'freeze' | 'restock' | 'milestone';

export function nudgeMatches(nudge: Nudge, filter: NudgeFilter) {
  if (filter === 'all') return true;
  if (filter === 'urgent') return nudge.kind === 'expiry';
  if (filter === 'milestone') return nudge.kind === 'win' || nudge.kind === 'milestone';
  return nudge.kind === filter;
}

const FREEZABLE = new Set(['proteins', 'bakery']);

function startOfWeekISO(now: Date) {
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  day.setDate(day.getDate() - ((day.getDay() + 6) % 7));
  return day;
}

export function buildNudges(input: {
  items: PantryItem[];
  events: ItemEvent[];
  ranked: RecipeMatch[];
  settings: Pick<Settings, 'nudgeTypes' | 'alertDaysBefore'>;
  streak: number;
  onRestockList: (name: string) => boolean;
  now?: Date;
}): Nudge[] {
  const { items, events, ranked, settings, streak, onRestockList } = input;
  const now = input.now ?? new Date();
  const iso = today();
  const types = settings.nudgeTypes;
  const active = items.filter((item) => item.status === 'active');
  const nudges: Nudge[] = [];

  if (types.expiry) {
    for (const item of active) {
      const days = daysLeft(item, iso);
      if (days > settings.alertDaysBefore) continue;
      const key = findFood(item.name)?.key;
      const recipes = types.recipes && key ? ranked.filter((match) => match.ingredients.some((entry) => entry.item?.id === item.id)) : [];
      nudges.push({ kind: 'expiry', id: `expiry-${item.id}-${item.expiresOn}`, section: 'today', item, days, recipes });
    }
  }

  if (types.duplicates) {
    const byKey = new Map<string, PantryItem[]>();
    for (const item of active) {
      const key = findFood(item.name)?.key ?? item.name.trim().toLowerCase();
      byKey.set(key, [...(byKey.get(key) ?? []), item]);
    }
    for (const group of byKey.values()) {
      if (group.length < 2) continue;
      const [older, newer] = [...group].sort((a, b) => a.expiresOn.localeCompare(b.expiresOn));
      nudges.push({ kind: 'duplicate', id: `dup-${older.id}-${newer.id}`, section: 'today', older, newer });
    }
  }

  if (types.shelfLife) {
    for (const item of active) {
      if (item.zone === 'freezer' || !FREEZABLE.has(item.category)) continue;
      const days = daysLeft(item, iso);
      if (days < 0 || days > 2) continue;
      const freezerDays = shelfLifeFor(item.category, 'freezer', findFood(item.name)).min;
      nudges.push({ kind: 'freeze', id: `freeze-${item.id}`, section: 'today', item, days, freezerDays });
    }
  }

  if (types.patterns) {
    const activeKeys = new Set(active.map((item) => findFood(item.name)?.key ?? item.name.toLowerCase()));
    const seen = new Set<string>();
    for (const item of items) {
      if (item.status !== 'used' || !item.resolvedAt || daysBetween(item.resolvedAt.slice(0, 10), iso) > 7) continue;
      const key = findFood(item.name)?.key ?? item.name.toLowerCase();
      if (activeKeys.has(key) || seen.has(key) || onRestockList(item.name)) continue;
      seen.add(key);
      nudges.push({ kind: 'restock', id: `restock-${item.id}`, section: 'week', item });
    }
  }

  if (types.weekly) {
    const weekStart = startOfWeekISO(now);
    const week = within(events, weekStart, new Date(now.getTime() + 1));
    const t = totals(week);
    if (t.savedCents > 0) {
      const names = [...new Set(week.filter((event) => event.type !== 'tossed' && event.type !== 'frozen').map((event) => event.itemName))];
      nudges.push({
        kind: 'win',
        id: `win-${weekStart.toISOString().slice(0, 10)}`,
        section: 'week',
        savedCents: t.savedCents,
        co2Kg: t.co2Kg,
        tossed: t.tossedItems,
        names: names.slice(0, 3).map((name) => name.replace(/\s*\(.*\)$/, '').toLowerCase()),
      });
    }
    const milestone = [30, 21, 14, 7].find((mark) => streak >= mark);
    if (milestone) nudges.push({ kind: 'milestone', id: `streak-${milestone}`, section: 'week', streak });
  }

  const order = { expiry: 0, duplicate: 1, freeze: 2, win: 3, restock: 4, milestone: 5 } as const;
  return nudges.sort(
    (a, b) =>
      order[a.kind] - order[b.kind] ||
      (a.kind === 'expiry' && b.kind === 'expiry' ? a.days - b.days : 0)
  );
}

