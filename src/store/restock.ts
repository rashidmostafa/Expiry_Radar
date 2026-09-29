import { randomUUID } from 'expo-crypto';
import { useSyncExternalStore } from 'react';

import { daysBetween, today } from '@/domain/dates';
import { findFood } from '@/domain/foods';
import type { CategoryId, PantryItem } from '@/domain/types';

import { addItems, draftFromName } from './pantry';
import { getValue, setValue } from './persistence';

export type RestockReason = 'depleted' | 'low' | 'manual' | 'recipe';

export type RestockEntry = {
  id: string;
  name: string;
  detail?: string;
  quantity: number;
  category: CategoryId;
  priceCents?: number;
  image?: string;
  reason: RestockReason;
  inCart: boolean;
  addedAt: string;
  /** Last edit time; shared lists merge on it (last write wins). */
  updatedAt: string;
  /** Pantry item this came from (depleted / running low). */
  sourceItemId?: string;
};

type State = { entries: RestockEntry[]; dismissed: string[] };

const KEY = 'restock';
let state: State = { entries: [], dismissed: [], ...getValue<State>(KEY) };
const listeners = new Set<() => void>();

function emit(next: State) {
  state = next;
  setValue(KEY, state);
  listeners.forEach((listener) => listener());
}

// ─── Sync hooks (see services/sync) ─────────────────────────────────────────

export type RestockChange = { entries?: string[]; deleted?: string[] };
const changeListeners = new Set<(change: RestockChange) => void>();

export function onRestockChange(listener: (change: RestockChange) => void) {
  changeListeners.add(listener);
  return () => {
    changeListeners.delete(listener);
  };
}

function reportChange(change: RestockChange) {
  changeListeners.forEach((listener) => listener(change));
}

export function getRestockSnapshot() {
  return state;
}

/** Merges list entries from the household (last write wins on updatedAt). */
export function applyRemoteRestock(remote: { entries?: RestockEntry[]; deleted?: string[] }) {
  const byId = new Map(state.entries.map((entry) => [entry.id, entry]));
  let changed = false;
  for (const entry of remote.entries ?? []) {
    const local = byId.get(entry.id);
    if (!local || (local.updatedAt ?? local.addedAt) < entry.updatedAt) {
      byId.set(entry.id, entry);
      changed = true;
    }
  }
  for (const id of remote.deleted ?? []) changed = byId.delete(id) || changed;
  if (changed) emit({ ...state, entries: [...byId.values()].sort((a, b) => b.addedAt.localeCompare(a.addedAt)) });
}

const getState = () => state;

export function useRestock() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getState,
    getState
  );
}

const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export function isOnList(name: string) {
  return state.entries.some((entry) => !entry.inCart && sameName(entry.name, name));
}

/** Adds (or bumps the quantity of) a list entry. */
export function addToRestock(
  input: Pick<RestockEntry, 'name'> & Partial<Omit<RestockEntry, 'id' | 'addedAt' | 'inCart'>>
) {
  const existing = state.entries.find((entry) => !entry.inCart && sameName(entry.name, input.name));
  if (existing) return existing;
  const food = findFood(input.name);
  const entry: RestockEntry = {
    id: randomUUID(),
    quantity: 1,
    category: food?.category ?? 'other',
    priceCents: food?.priceCents,
    image: food?.image,
    reason: 'manual',
    ...input,
    inCart: false,
    addedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  emit({ ...state, entries: [entry, ...state.entries] });
  reportChange({ entries: [entry.id] });
  return entry;
}

export function updateRestock(id: string, patch: Partial<RestockEntry>) {
  const updatedAt = new Date().toISOString();
  emit({ ...state, entries: state.entries.map((entry) => (entry.id === id ? { ...entry, ...patch, updatedAt } : entry)) });
  reportChange({ entries: [id] });
}

export function removeRestock(id: string) {
  emit({ ...state, entries: state.entries.filter((entry) => entry.id !== id) });
  reportChange({ deleted: [id] });
}

export function clearCart() {
  const removed = state.entries.filter((entry) => entry.inCart).map((entry) => entry.id);
  emit({ ...state, entries: state.entries.filter((entry) => !entry.inCart) });
  reportChange({ deleted: removed });
}

/** Hide a suggestion without adding it. */
export function dismissSuggestion(itemId: string) {
  emit({ ...state, dismissed: [...state.dismissed, itemId] });
}

/** Everything in the cart becomes tracked pantry items with smart-default expiry. */
export function finishRun() {
  const bought = state.entries.filter((entry) => entry.inCart);
  addItems(
    bought.map((entry) =>
      draftFromName(entry.name, {
        detail: entry.detail,
        quantity: entry.quantity,
        category: entry.category,
        priceCents: entry.priceCents,
        image: entry.image,
      })
    )
  );
  emit({ ...state, entries: state.entries.filter((entry) => !entry.inCart) });
  reportChange({ deleted: bought.map((entry) => entry.id) });
  return bought.length;
}

export type RestockSuggestion = {
  item: PantryItem;
  reason: 'depleted' | 'low';
  note: string;
};

/**
 * Items worth buying again, derived from the pantry: used up in the last two weeks with
 * nothing left of that food, or still here but nearly gone / about to expire.
 */
export function restockSuggestions(items: PantryItem[], restock: State): RestockSuggestion[] {
  const now = today();
  const key = (item: PantryItem) => findFood(item.name)?.key ?? item.name.trim().toLowerCase();
  const activeKeys = new Set(items.filter((item) => item.status === 'active').map(key));
  const listed = (item: PantryItem) =>
    restock.dismissed.includes(item.id) ||
    restock.entries.some((entry) => entry.sourceItemId === item.id || (!entry.inCart && sameName(entry.name, item.name)));

  const seen = new Set<string>();
  const suggestions: RestockSuggestion[] = [];
  for (const item of [...items].sort((a, b) => (b.resolvedAt ?? '').localeCompare(a.resolvedAt ?? ''))) {
    if (item.status === 'active' || !item.resolvedAt || listed(item)) continue;
    if (daysBetween(item.resolvedAt.slice(0, 10), now) > 14 || activeKeys.has(key(item)) || seen.has(key(item))) continue;
    seen.add(key(item));
    const days = daysBetween(item.resolvedAt.slice(0, 10), now);
    suggestions.push({
      item,
      reason: 'depleted',
      note: `${item.status === 'tossed' ? 'Tossed' : 'Used up'} ${days === 0 ? 'today' : days === 1 ? 'yesterday' : `${days}d ago`}`,
    });
  }
  for (const item of items) {
    if (item.status !== 'active' || listed(item) || seen.has(key(item))) continue;
    const days = daysBetween(now, item.expiresOn);
    if (item.remainingPct > 30 && days > 3) continue;
    seen.add(key(item));
    suggestions.push({
      item,
      reason: 'low',
      note: item.remainingPct <= 30 ? `${item.remainingPct}% remaining` : days <= 0 ? 'Expires today' : `Expires in ${days} ${days === 1 ? 'day' : 'days'}`,
    });
  }
  return suggestions;
}
