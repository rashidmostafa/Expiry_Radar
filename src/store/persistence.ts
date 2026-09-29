import * as SQLite from 'expo-sqlite';

import type { ItemEvent, PantryItem } from '@/domain/types';

/**
 * Local-first storage (native). Rows keep the full record as JSON plus the columns we query on,
 * so the schema can grow without migrations and records sync as whole documents later.
 * Web uses persistence.web.ts with the same API.
 */
const db = SQLite.openDatabaseSync('expiry-radar.db');

db.execSync(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY NOT NULL,
    status TEXT NOT NULL,
    expires_on TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    data TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS items_status_expiry ON items (status, expires_on);
  CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY NOT NULL,
    item_id TEXT NOT NULL,
    at TEXT NOT NULL,
    data TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS events_at ON events (at);
  CREATE TABLE IF NOT EXISTS kv (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );
`);

export function loadItems(): PantryItem[] {
  return db
    .getAllSync<{ data: string }>('SELECT data FROM items ORDER BY expires_on')
    .map((row) => JSON.parse(row.data));
}

export function saveItems(items: PantryItem[]) {
  db.withTransactionSync(() => {
    for (const item of items) {
      db.runSync(
        'INSERT OR REPLACE INTO items (id, status, expires_on, updated_at, data) VALUES (?, ?, ?, ?, ?)',
        item.id,
        item.status,
        item.expiresOn,
        item.updatedAt,
        JSON.stringify(item)
      );
    }
  });
}

export function deleteItem(id: string) {
  db.runSync('DELETE FROM items WHERE id = ?', id);
}

export function loadEvents(): ItemEvent[] {
  return db
    .getAllSync<{ data: string }>('SELECT data FROM events ORDER BY at DESC')
    .map((row) => JSON.parse(row.data));
}

export function saveEvents(events: ItemEvent[]) {
  db.withTransactionSync(() => {
    for (const event of events) {
      db.runSync(
        'INSERT OR REPLACE INTO events (id, item_id, at, data) VALUES (?, ?, ?, ?)',
        event.id,
        event.itemId,
        event.at,
        JSON.stringify(event)
      );
    }
  });
}

export function deleteEvent(id: string) {
  db.runSync('DELETE FROM events WHERE id = ?', id);
}

export function getValue<T>(key: string): T | undefined {
  const row = db.getFirstSync<{ value: string }>('SELECT value FROM kv WHERE key = ?', key);
  return row ? (JSON.parse(row.value) as T) : undefined;
}

export function setValue(key: string, value: unknown) {
  db.runSync('INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)', key, JSON.stringify(value));
}
