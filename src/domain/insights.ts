import { categories } from './categories';
import { findFood } from './foods';
import type { CategoryId, ItemEvent } from './types';

/**
 * Waste & savings analytics over the item ledger. Everything here is pure so screens,
 * nudges and notifications can share it.
 */

export type Period = 'week' | 'month' | '90d' | 'all';

export type Bucket = { label: string; start: Date; end: Date };

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const DAY_MS = 86_400_000;

/** kg CO2e avoided per kg of food not wasted (WRAP/EPA household ballpark). */
export const CO2_PER_KG = 2.5;
/** kg CO2e per mile driven by an average car. */
const CO2_PER_MILE = 0.4;

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfWeek(date: Date) {
  const day = startOfDay(date);
  day.setDate(day.getDate() - ((day.getDay() + 6) % 7));
  return day;
}

export function isRescue(event: ItemEvent) {
  return event.type === 'used' || event.type === 'used_partial';
}

export function eventCategory(event: ItemEvent): CategoryId {
  return event.category ?? findFood(event.itemName)?.category ?? 'other';
}

/** The period's window, the same elapsed span of the previous period, and chart buckets. */
export function periodRange(period: Period, events: ItemEvent[], now = new Date()) {
  const range = rawRange(period, events, now);
  // Compare like with like: two days into this week vs the first two days of last week.
  const elapsed = range.end.getTime() - range.start.getTime();
  return { ...range, prevEnd: new Date(Math.min(range.start.getTime(), range.prevStart.getTime() + elapsed)) };
}

function rawRange(period: Period, events: ItemEvent[], now: Date) {
  const end = new Date(now.getTime() + 1);
  if (period === 'week') {
    const start = startOfWeek(now);
    const buckets = DAYS.map((label, index) => {
      const day = new Date(start.getTime() + index * DAY_MS);
      return { label, start: day, end: new Date(day.getTime() + DAY_MS) };
    });
    return { start, end, prevStart: new Date(start.getTime() - 7 * DAY_MS), buckets };
  }
  if (period === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const buckets: Bucket[] = [];
    for (let weekStart = start; weekStart < end; weekStart = new Date(weekStart.getTime() + 7 * DAY_MS)) {
      buckets.push({ label: `W${buckets.length + 1}`, start: weekStart, end: new Date(Math.min(weekStart.getTime() + 7 * DAY_MS, end.getTime())) });
    }
    return { start, end, prevStart: new Date(now.getFullYear(), now.getMonth() - 1, 1), buckets };
  }
  if (period === '90d') {
    const start = new Date(startOfDay(now).getTime() - 89 * DAY_MS);
    const buckets: Bucket[] = [];
    for (let weekStart = start; weekStart < end; weekStart = new Date(weekStart.getTime() + 14 * DAY_MS)) {
      buckets.push({
        label: `${MONTHS[weekStart.getMonth()]} ${weekStart.getDate()}`,
        start: weekStart,
        end: new Date(Math.min(weekStart.getTime() + 14 * DAY_MS, end.getTime())),
      });
    }
    return { start, end, prevStart: new Date(start.getTime() - 90 * DAY_MS), buckets };
  }
  const first = events.map((event) => event.at).sort()[0];
  const firstDate = first ? new Date(first) : now;
  const monthsBack = Math.min(11, (now.getFullYear() - firstDate.getFullYear()) * 12 + now.getMonth() - firstDate.getMonth());
  const start = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
  return { start, end, prevStart: start, buckets: monthBuckets(start, now) };
}

function monthBuckets(start: Date, now: Date) {
  const buckets: Bucket[] = [];
  for (let month = new Date(start); month <= now; month = new Date(month.getFullYear(), month.getMonth() + 1, 1)) {
    buckets.push({ label: MONTHS[month.getMonth()].charAt(0), start: month, end: new Date(month.getFullYear(), month.getMonth() + 1, 1) });
  }
  return buckets;
}

export function within(events: ItemEvent[], start: Date, end: Date) {
  const from = start.toISOString();
  const to = end.toISOString();
  return events.filter((event) => event.at >= from && event.at < to);
}

export type Totals = {
  savedCents: number;
  wastedCents: number;
  rescuedItems: number;
  /** Used within 2 days of the date — "rescued right before expiry". */
  lastMinuteItems: number;
  tossedItems: number;
  gramsDiverted: number;
  co2Kg: number;
  carMiles: number;
  /** Share of resolved food that was eaten rather than tossed. */
  eatenPct: number;
};

export function totals(events: ItemEvent[]): Totals {
  const rescued = events.filter(isRescue);
  const tossed = events.filter((event) => event.type === 'tossed');
  const rescuedItems = new Set(rescued.map((event) => event.itemId)).size;
  const tossedItems = new Set(tossed.map((event) => event.itemId)).size;
  const gramsDiverted = rescued.reduce((sum, event) => sum + event.grams, 0);
  const co2Kg = (gramsDiverted / 1000) * CO2_PER_KG;
  const resolved = rescuedItems + tossedItems;
  return {
    savedCents: rescued.reduce((sum, event) => sum + event.valueCents, 0),
    wastedCents: tossed.reduce((sum, event) => sum + event.valueCents, 0),
    rescuedItems,
    lastMinuteItems: new Set(rescued.filter((event) => (event.daysLeft ?? 99) <= 2).map((event) => event.itemId)).size,
    tossedItems,
    gramsDiverted,
    co2Kg,
    carMiles: Math.round(co2Kg / CO2_PER_MILE),
    eatenPct: resolved === 0 ? 100 : Math.round((rescuedItems / resolved) * 100),
  };
}

export type BarDatum = { label: string; rescued: number; lastMinute: number; tossed: number; savedCents: number; wastedCents: number };

export function series(events: ItemEvent[], buckets: Bucket[]): BarDatum[] {
  return buckets.map((bucket) => {
    const slice = within(events, bucket.start, bucket.end);
    const rescued = slice.filter(isRescue);
    const lastMinute = rescued.filter((event) => (event.daysLeft ?? 99) <= 2).length;
    const tossed = slice.filter((event) => event.type === 'tossed');
    return {
      label: bucket.label,
      rescued: rescued.length - lastMinute,
      lastMinute,
      tossed: tossed.length,
      savedCents: rescued.reduce((sum, event) => sum + event.valueCents, 0),
      wastedCents: tossed.reduce((sum, event) => sum + event.valueCents, 0),
    };
  });
}

export type CategoryHealth = { category: CategoryId; label: string; savedCents: number; tossed: number; eatenPct: number; events: number };

export function categoryHealth(events: ItemEvent[]): CategoryHealth[] {
  const groups = new Map<CategoryId, ItemEvent[]>();
  for (const event of events) {
    if (event.type === 'frozen') continue;
    const category = eventCategory(event);
    groups.set(category, [...(groups.get(category) ?? []), event]);
  }
  return [...groups.entries()]
    .map(([category, list]) => {
      const t = totals(list);
      return { category, label: categories[category].label, savedCents: t.savedCents, tossed: t.tossedItems, eatenPct: t.eatenPct, events: list.length };
    })
    .sort((a, b) => b.savedCents - a.savedCents);
}

/** Most valuable foods used shortly before their date. */
export function keyRescues(events: ItemEvent[], limit = 3) {
  const best = new Map<string, ItemEvent>();
  for (const event of events) {
    if (!isRescue(event) || (event.daysLeft ?? 99) > 4) continue;
    const current = best.get(event.itemName);
    if (!current || event.valueCents > current.valueCents) best.set(event.itemName, event);
  }
  return [...best.values()].sort((a, b) => b.valueCents - a.valueCents).slice(0, limit);
}

/** Recipe that rescued the most value in these events. */
export function bestRecipe(events: ItemEvent[]) {
  const byRecipe = new Map<string, { cents: number; items: Set<string> }>();
  for (const event of events) {
    if (!event.recipeId || !isRescue(event)) continue;
    const entry = byRecipe.get(event.recipeId) ?? { cents: 0, items: new Set() };
    entry.cents += event.valueCents;
    entry.items.add(event.itemName);
    byRecipe.set(event.recipeId, entry);
  }
  const [top] = [...byRecipe.entries()].sort((a, b) => b[1].cents - a[1].cents);
  return top ? { recipeId: top[0], cents: top[1].cents, items: [...top[1].items] } : undefined;
}

/** Longest run of days with nothing tossed, across the whole ledger. */
export function longestStreak(events: ItemEvent[], now = new Date()) {
  if (events.length === 0) return 0;
  const tosses = events.filter((event) => event.type === 'tossed').map((event) => new Date(event.at).getTime()).sort((a, b) => a - b);
  const first = Math.min(...events.map((event) => new Date(event.at).getTime()));
  const marks = [first, ...tosses, now.getTime()];
  let longest = 0;
  for (let index = 1; index < marks.length; index++) {
    longest = Math.max(longest, Math.floor((marks[index] - marks[index - 1]) / DAY_MS));
  }
  return longest;
}

const TIERS = [
  { name: 'Fresh Sprout', points: 0 },
  { name: 'Pantry Saver', points: 200 },
  { name: 'Kitchen Hero', points: 500 },
  { name: 'Master Conserver', points: 1000 },
  { name: 'Zero-Waste Legend', points: 2000 },
];

/** 10 points per rescued item, 5 bonus when it was a last-minute save. */
export function householdTier(events: ItemEvent[]) {
  const t = totals(events);
  const points = t.rescuedItems * 10 + t.lastMinuteItems * 5;
  const index = TIERS.reduce((found, tier, i) => (points >= tier.points ? i : found), 0);
  const next = TIERS[index + 1];
  return { name: TIERS[index].name, level: index + 1, points, next: next?.name, nextPoints: next?.points };
}

export type Milestone = { id: string; title: string; detail: string; icon: 'verified' | 'workspace_premium' | 'auto_awesome' | 'lock'; achieved: boolean; progress: string };

export function milestones(events: ItemEvent[]): Milestone[] {
  const t = totals(events);
  const streak = longestStreak(events);
  const produce = totals(events.filter((event) => eventCategory(event) === 'produce'));
  return [
    { id: 'century', title: 'Century Club', detail: '100+ foods saved', icon: 'verified', achieved: t.rescuedItems >= 100, progress: `${Math.min(100, t.rescuedItems)}/100` },
    { id: 'streak', title: '30-Day Streak', detail: 'A month with zero waste', icon: 'workspace_premium', achieved: streak >= 30, progress: `${Math.min(30, streak)}/30 days` },
    {
      id: 'crisper',
      title: 'Crisper Pro',
      detail: '90% of produce eaten',
      icon: 'auto_awesome',
      achieved: produce.rescuedItems >= 10 && produce.eatenPct >= 90,
      progress: produce.rescuedItems + produce.tossedItems === 0 ? 'No produce yet' : `${produce.eatenPct}% eaten`,
    },
    {
      id: 'zen',
      title: 'Pantry Zen',
      detail: 'Reach $500 saved total',
      icon: 'lock',
      achieved: t.savedCents >= 50_000,
      progress: t.savedCents >= 50_000 ? 'Reached' : `$${((50_000 - t.savedCents) / 100).toFixed(2)} to go`,
    },
  ];
}

export type AuditTip = { icon: 'eco' | 'shopping_cart' | 'notifications_active' | 'ac_unit'; title: string; body: string; badge: string; tone: 'good' | 'warn' };

/** Rules that turn ledger patterns into concrete, kind suggestions. */
export function kitchenAudit(events: ItemEvent[]): AuditTip[] {
  const tips: AuditTip[] = [];
  const health = categoryHealth(events).filter((entry) => entry.events >= 3);
  const weakest = [...health].sort((a, b) => a.eatenPct - b.eatenPct)[0];
  if (weakest && weakest.eatenPct < 95) {
    tips.push({
      icon: weakest.category === 'produce' ? 'eco' : 'ac_unit',
      title: `${weakest.label} need a little love`,
      body:
        weakest.category === 'produce'
          ? 'Your greens and fruit are the most likely to slip. A dry paper towel in the crisper and a front-row spot in the fridge buys them extra days.'
          : `${weakest.label} is where most of your waste comes from. Freeze portions you won't finish the day you open them.`,
      badge: `${weakest.eatenPct}% eaten`,
      tone: 'warn',
    });
  }
  const t = totals(events);
  if (t.rescuedItems >= 5 && t.lastMinuteItems / t.rescuedItems > 0.5) {
    tips.push({
      icon: 'notifications_active',
      title: 'Lots of last-minute saves',
      body: 'More than half of your rescues happen in the final two days. A 3-day early warning gives you time to plan a meal instead of scrambling.',
      badge: '+1 day',
      tone: 'good',
    });
  }
  const tossedThenBought = events.filter((event) => event.type === 'tossed' && (event.daysLeft ?? 0) < -2).length;
  if (tossedThenBought >= 2) {
    tips.push({
      icon: 'shopping_cart',
      title: 'Buy a little smaller',
      body: 'A few items were tossed well past their date. Smaller packs or one extra mid-week shop can cut that waste without changing what you cook.',
      badge: `${tossedThenBought} forgotten`,
      tone: 'warn',
    });
  }
  if (tips.length === 0) {
    tips.push({
      icon: 'eco',
      title: 'Your kitchen is running smoothly',
      body: 'Keep marking what you use and toss — the radar learns your habits and will suggest improvements here.',
      badge: 'On track',
      tone: 'good',
    });
  }
  return tips;
}

/** Month-by-month saved vs wasted for a calendar year. */
export function yearSeries(events: ItemEvent[], year: number, now = new Date()) {
  const lastMonth = year === now.getFullYear() ? now.getMonth() : 11;
  return series(events, monthBuckets(new Date(year, 0, 1), new Date(year, lastMonth, 1)));
}

/** Projection for the rest of the year from the monthly average so far. */
export function yearOutlook(events: ItemEvent[], now = new Date()) {
  const ytd = totals(within(events, new Date(now.getFullYear(), 0, 1), new Date(now.getTime() + 1)));
  const monthsElapsed = now.getMonth() + now.getDate() / 31;
  return {
    ytdCents: ytd.savedCents,
    projectedCents: Math.round((ytd.savedCents / Math.max(1, monthsElapsed)) * 12),
    progressPct: Math.round((monthsElapsed / 12) * 100),
  };
}

export function changePct(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}
