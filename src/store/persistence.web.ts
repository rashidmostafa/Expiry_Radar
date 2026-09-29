import type { ItemEvent, PantryItem } from '@/domain/types';

/**
 * Web preview storage with the same API as persistence.ts (SQLite on device).
 * localStorage is unavailable during static rendering, so every access is guarded.
 */
const PREFIX = 'expiry-radar:';

function read<T>(key: string, fallback: T): T {
  try {
    const raw = globalThis.localStorage?.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    globalThis.localStorage?.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Storage full or blocked: the session keeps working in memory.
  }
}

function upsert<T extends { id: string }>(key: string, records: T[]) {
  const byId = new Map(read<T[]>(key, []).map((record) => [record.id, record]));
  for (const record of records) byId.set(record.id, record);
  write(key, [...byId.values()]);
}

function remove(key: string, id: string) {
  write(
    key,
    read<{ id: string }[]>(key, []).filter((record) => record.id !== id)
  );
}

export function loadItems(): PantryItem[] {
  return read<PantryItem[]>('items', []).sort((a, b) => a.expiresOn.localeCompare(b.expiresOn));
}

export function saveItems(items: PantryItem[]) {
  upsert('items', items);
}

export function deleteItem(id: string) {
  remove('items', id);
}

export function loadEvents(): ItemEvent[] {
  return read<ItemEvent[]>('events', []).sort((a, b) => b.at.localeCompare(a.at));
}

export function saveEvents(events: ItemEvent[]) {
  upsert('events', events);
}

export function deleteEvent(id: string) {
  remove('events', id);
}

export function getValue<T>(key: string): T | undefined {
  return read<T | undefined>(`kv:${key}`, undefined);
}

export function setValue(key: string, value: unknown) {
  write(`kv:${key}`, value);
}
