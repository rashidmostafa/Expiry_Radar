import { randomUUID } from 'expo-crypto';
import { useMemo, useSyncExternalStore } from 'react';

import { categories } from '@/domain/categories';
import { addDays, daysBetween, today } from '@/domain/dates';
import { byExpiry } from '@/domain/expiry';
import { findFood, shelfLifeFor } from '@/domain/foods';
import type { ItemEvent, ItemEventType, NewPantryItem, PantryItem } from '@/domain/types';
import { cancelExpiryNudge, scheduleExpiryNudge } from '@/services/notifications';

import * as persistence from './persistence';

type State = { items: PantryItem[]; events: ItemEvent[] };

let state: State = { items: persistence.loadItems(), events: persistence.loadEvents() };
const listeners = new Set<() => void>();

function emit(next: State) {
  state = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getState = () => state;

function now() {
  return new Date().toISOString();
}

function commitItems(changed: PantryItem[]) {
  persistence.saveItems(changed);
  const byId = new Map(state.items.map((item) => [item.id, item]));
  for (const item of changed) byId.set(item.id, item);
  emit({ ...state, items: [...byId.values()] });
  for (const item of changed) {
    if (item.status === 'active' && item.alertEnabled) scheduleExpiryNudge(item);
    else cancelExpiryNudge(item.id);
  }
}

function recordEvent(item: PantryItem, type: ItemEventType, fraction: number): ItemEvent {
  const food = findFood(item.name);
  const valueCents = item.priceCents ?? food?.priceCents ?? 0;
  const grams = item.weightGrams ?? food?.grams ?? 0;
  const event: ItemEvent = {
    id: randomUUID(),
    itemId: item.id,
    itemName: item.name,
    type,
    fraction,
    valueCents: Math.round(valueCents * fraction),
    grams: Math.round(grams * fraction),
    at: now(),
  };
  persistence.saveEvents([event]);
  emit({ ...state, events: [event, ...state.events] });
  return event;
}

// ─── Queries ────────────────────────────────────────────────────────────────

export function getItem(id: string) {
  return state.items.find((item) => item.id === id);
}

export function useItems() {
  return useSyncExternalStore(subscribe, getState, getState).items;
}

/** Items still in the kitchen, soonest expiry first — "urgent items always float to the top". */
export function useActiveItems() {
  const items = useItems();
  return useMemo(() => items.filter((item) => item.status === 'active').sort(byExpiry), [items]);
}

export function useItem(id: string | undefined) {
  const items = useItems();
  return useMemo(() => items.find((item) => item.id === id), [items, id]);
}

export function useEvents() {
  return useSyncExternalStore(subscribe, getState, getState).events;
}

// ─── Mutations ──────────────────────────────────────────────────────────────

export function addItems(drafts: NewPantryItem[]) {
  const stamp = now();
  const items = drafts.map<PantryItem>((draft) => ({
    status: 'active',
    ...draft,
    id: randomUUID(),
    createdAt: stamp,
    updatedAt: stamp,
  }));
  commitItems(items);
  return items;
}

export function updateItem(id: string, patch: Partial<PantryItem>) {
  const item = getItem(id);
  if (!item) return;
  commitItems([{ ...item, ...patch, updatedAt: now() }]);
}

/** One-tap "Mark Used": the whole item was eaten. */
export function markUsed(id: string) {
  const item = getItem(id);
  if (!item) return;
  recordEvent(item, 'used', item.remainingPct / 100);
  commitItems([{ ...item, status: 'used', remainingPct: 0, resolvedAt: now(), updatedAt: now() }]);
}

/** Used part of it; the rest stays tracked. */
export function consumePortion(id: string, percent: number) {
  const item = getItem(id);
  if (!item) return;
  const used = Math.min(item.remainingPct, percent);
  const remainingPct = item.remainingPct - used;
  recordEvent(item, remainingPct === 0 ? 'used' : 'used_partial', used / 100);
  commitItems([
    {
      ...item,
      remainingPct,
      status: remainingPct === 0 ? 'used' : 'active',
      openedOn: item.openedOn ?? today(),
      resolvedAt: remainingPct === 0 ? now() : undefined,
      updatedAt: now(),
    },
  ]);
}

export function tossItem(id: string) {
  const item = getItem(id);
  if (!item) return;
  recordEvent(item, 'tossed', item.remainingPct / 100);
  commitItems([{ ...item, status: 'tossed', resolvedAt: now(), updatedAt: now() }]);
}

/** Move to the freezer and restart the clock with freezer shelf life. */
export function freezeItem(id: string) {
  const item = getItem(id);
  if (!item || item.zone === 'freezer') return;
  const life = shelfLifeFor(item.category, 'freezer', findFood(item.name));
  recordEvent(item, 'frozen', 0);
  commitItems([
    {
      ...item,
      zone: 'freezer',
      shelf: undefined,
      expiresOn: addDays(today(), life.min),
      updatedAt: now(),
    },
  ]);
}

/** Undo a used/tossed resolution (Stitch "Undo" toasts). */
export function restoreItem(id: string, previous: PantryItem) {
  const events = state.events.filter((event) => event.itemId === id && event.at >= previous.updatedAt);
  events.forEach((event) => persistence.deleteEvent(event.id));
  emit({ ...state, events: state.events.filter((event) => !events.includes(event)) });
  commitItems([{ ...previous, updatedAt: now() }]);
}

let lastCook: PantryItem[] = [];

/** Deducts cooked portions (percent of each item) in one step that "Undo" can reverse. */
export function cookDeductions(deductions: { id: string; percent: number }[]) {
  lastCook = deductions.map(({ id }) => getItem(id)).filter((item): item is PantryItem => !!item);
  let grams = 0;
  for (const { id, percent } of deductions) {
    const item = getItem(id);
    if (!item) continue;
    grams += Math.round(((item.weightGrams ?? findFood(item.name)?.grams ?? 0) * Math.min(percent, item.remainingPct)) / 100);
    consumePortion(id, percent);
  }
  return grams;
}

export function undoLastCook() {
  for (const item of lastCook) restoreItem(item.id, item);
  lastCook = [];
}

/** Re-plans every nudge, e.g. after the alert timing settings change. */
export function rescheduleNudges() {
  for (const item of state.items) {
    if (item.status === 'active' && item.alertEnabled) scheduleExpiryNudge(item);
  }
}

/** Adds past ledger entries (imports, demo history). */
export function importEvents(events: ItemEvent[]) {
  persistence.saveEvents(events);
  emit({ ...state, events: [...events, ...state.events].sort((a, b) => b.at.localeCompare(a.at)) });
}

export function removeItem(id: string) {
  persistence.deleteItem(id);
  cancelExpiryNudge(id);
  emit({ ...state, items: state.items.filter((item) => item.id !== id) });
}

// ─── Draft helpers ──────────────────────────────────────────────────────────

/** Sensible defaults for a new item from just a name: the app does the remembering. */
export function draftFromName(name: string, overrides: Partial<NewPantryItem> = {}): NewPantryItem {
  const food = findFood(name);
  const category = overrides.category ?? food?.category ?? 'other';
  const zone = overrides.zone ?? food?.zone ?? categories[category].zone;
  const purchasedOn = overrides.purchasedOn ?? today();
  const life = shelfLifeFor(category, zone, food);
  return {
    name,
    category,
    zone,
    shelf: food?.shelf,
    quantity: 1,
    unit: 'pack',
    remainingPct: 100,
    purchasedOn,
    expiresOn: addDays(purchasedOn, life.min),
    image: food?.image,
    source: 'manual',
    alertEnabled: true,
    ...overrides,
  };
}

/** Totals for home/profile stats. */
export function summarize(items: PantryItem[], events: ItemEvent[], since?: string) {
  const inWindow = since ? events.filter((event) => event.at >= since) : events;
  const rescued = inWindow.filter((event) => event.type === 'used' || event.type === 'used_partial');
  const tossed = inWindow.filter((event) => event.type === 'tossed');
  const savedCents = rescued.reduce((sum, event) => sum + event.valueCents, 0);
  const rescuedGrams = rescued.reduce((sum, event) => sum + event.grams, 0);
  const rescuedItems = new Set(rescued.map((event) => event.itemId)).size;
  const tossedItems = new Set(tossed.map((event) => event.itemId)).size;
  // ~2.5 kg CO2e per kg of household food waste avoided (WRAP/EPA ballpark).
  const co2Kg = (rescuedGrams / 1000) * 2.5;
  const resolved = rescuedItems + tossedItems;
  return {
    savedCents,
    rescuedItems,
    tossedItems,
    rescuedGrams,
    co2Kg,
    /** Share of resolved food that was eaten rather than tossed. */
    freshnessPct: resolved === 0 ? 100 : Math.round((rescuedItems / resolved) * 100),
  };
}

/** Consecutive days (ending today) without tossing anything, since the first tracked event. */
export function zeroWasteStreak(events: ItemEvent[], items: PantryItem[]) {
  const firstTracked = [...items.map((item) => item.createdAt), ...events.map((event) => event.at)]
    .sort()
    .at(0);
  if (!firstTracked) return 0;
  const lastToss = events.find((event) => event.type === 'tossed')?.at;
  const start = lastToss && lastToss > firstTracked ? lastToss : firstTracked;
  return Math.max(0, daysBetween(start.slice(0, 10), today()));
}
