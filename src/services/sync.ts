import type { RealtimeChannel } from '@supabase/supabase-js';
import { useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import type { ItemEvent, PantryItem } from '@/domain/types';
import { supabase } from '@/lib/supabase';
import { applyRemote, getSnapshot, onLocalChange } from '@/store/pantry';
import { getValue, setValue } from '@/store/persistence';
import { applyRemoteRestock, getRestockSnapshot, onRestockChange, type RestockEntry } from '@/store/restock';

/**
 * Household sync. Every device keeps its full local copy (SQLite); this service
 * - pushes local edits from a persisted outbox (so offline edits go out later),
 * - pulls rows other members changed since the last `synced_at` cursor,
 * - listens on Supabase Realtime so changes arrive within a second or two.
 * Conflicts resolve last-write-wins on each record's edit time, enforced by a database trigger.
 */

const TABLES = { items: 'pantry_items', events: 'ledger_events', restock: 'restock_entries' } as const;
type Kind = keyof typeof TABLES;
const KINDS = Object.keys(TABLES) as Kind[];

type Outbox = { upsert: Record<Kind, string[]>; remove: Record<Kind, { id: string; at: string }[]> };
type Cursors = { householdId?: string } & Partial<Record<Kind, string>>;
type Row = { id: string; household_id: string; data: unknown; updated_at: string; deleted: boolean; synced_at: string };

const OUTBOX_KEY = 'sync-outbox';
const CURSOR_KEY = 'sync-cursors';
const PAGE = 500;

const emptyOutbox = (): Outbox => ({ upsert: { items: [], events: [], restock: [] }, remove: { items: [], events: [], restock: [] } });

let outbox: Outbox = { ...emptyOutbox(), ...getValue<Outbox>(OUTBOX_KEY) };

export type SyncStatus = { state: 'off' | 'idle' | 'syncing' | 'error'; lastSyncedAt?: string; error?: string };
let status: SyncStatus = { state: 'off' };
const statusListeners = new Set<() => void>();

function setStatus(next: SyncStatus) {
  status = next;
  statusListeners.forEach((listener) => listener());
}

export function useSyncStatus() {
  return useSyncExternalStore(
    (listener) => {
      statusListeners.add(listener);
      return () => statusListeners.delete(listener);
    },
    () => status,
    () => status
  );
}

function saveOutbox() {
  setValue(OUTBOX_KEY, outbox);
}

function queue(kind: Kind, ids: string[] = [], removed: string[] = []) {
  if (!ids.length && !removed.length) return;
  const at = new Date().toISOString();
  const upsert = new Set(outbox.upsert[kind]);
  ids.forEach((id) => upsert.add(id));
  removed.forEach((id) => upsert.delete(id));
  outbox = {
    upsert: { ...outbox.upsert, [kind]: [...upsert] },
    remove: { ...outbox.remove, [kind]: [...outbox.remove[kind].filter((entry) => !removed.includes(entry.id)), ...removed.map((id) => ({ id, at }))] },
  };
  saveOutbox();
}

/** Marks every local record for upload — used when joining or creating a household. */
export function queueEverything() {
  const { items, events } = getSnapshot();
  queue('items', items.map((item) => item.id));
  queue('events', events.map((event) => event.id));
  queue('restock', getRestockSnapshot().entries.map((entry) => entry.id));
}

/** Forget pull positions so the next sync re-downloads the household (after a local wipe). */
export function resetCursors() {
  setValue(CURSOR_KEY, {});
}

function recordFor(kind: Kind, id: string): { data: unknown; updatedAt: string } | undefined {
  if (kind === 'items') {
    const item = getSnapshot().items.find((entry) => entry.id === id);
    return item && { data: item, updatedAt: item.updatedAt };
  }
  if (kind === 'events') {
    const event = getSnapshot().events.find((entry) => entry.id === id);
    return event && { data: event, updatedAt: event.at };
  }
  const entry = getRestockSnapshot().entries.find((candidate) => candidate.id === id);
  return entry && { data: entry, updatedAt: entry.updatedAt ?? entry.addedAt };
}

async function push(householdId: string) {
  if (!supabase) return;
  for (const kind of KINDS) {
    const ids = outbox.upsert[kind];
    const removals = outbox.remove[kind];
    const rows = [
      ...ids.flatMap((id) => {
        const record = recordFor(kind, id);
        return record ? [{ id, household_id: householdId, data: record.data, updated_at: record.updatedAt, deleted: false }] : [];
      }),
      ...removals.map((entry) => ({ id: entry.id, household_id: householdId, data: {}, updated_at: entry.at, deleted: true })),
    ];
    for (let start = 0; start < rows.length; start += PAGE) {
      const { error } = await supabase.from(TABLES[kind]).upsert(rows.slice(start, start + PAGE), { onConflict: 'id' });
      if (error) throw new Error(error.message);
    }
    // Only drop what was sent; edits made while uploading stay queued.
    outbox = {
      upsert: { ...outbox.upsert, [kind]: outbox.upsert[kind].filter((id) => !ids.includes(id)) },
      remove: { ...outbox.remove, [kind]: outbox.remove[kind].filter((entry) => !removals.includes(entry)) },
    };
    saveOutbox();
  }
}

async function pull(householdId: string) {
  if (!supabase) return;
  let cursors = getValue<Cursors>(CURSOR_KEY) ?? {};
  if (cursors.householdId !== householdId) cursors = { householdId };

  for (const kind of KINDS) {
    for (;;) {
      let query = supabase
        .from(TABLES[kind])
        .select('id, household_id, data, updated_at, deleted, synced_at')
        .eq('household_id', householdId)
        .order('synced_at', { ascending: true })
        .limit(PAGE);
      if (cursors[kind]) query = query.gt('synced_at', cursors[kind]);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      const rows = (data ?? []) as Row[];
      if (rows.length === 0) break;

      const live = rows.filter((row) => !row.deleted);
      const deleted = rows.filter((row) => row.deleted).map((row) => row.id);
      if (kind === 'items') applyRemote({ items: live.map((row) => row.data as PantryItem), deletedItems: deleted });
      else if (kind === 'events') applyRemote({ events: live.map((row) => row.data as ItemEvent), deletedEvents: deleted });
      else applyRemoteRestock({ entries: live.map((row) => row.data as RestockEntry), deleted });

      cursors = { ...cursors, [kind]: rows[rows.length - 1].synced_at };
      setValue(CURSOR_KEY, cursors);
      if (rows.length < PAGE) break;
    }
  }
}

let active: { householdId: string; stop: () => void } | undefined;
let running: Promise<void> | undefined;
let again = false;
let pushTimer: ReturnType<typeof setTimeout> | undefined;

/** Push pending edits, then pull everyone else's. Coalesces overlapping calls. */
export function syncNow(): Promise<void> {
  if (!active) return Promise.resolve();
  if (running) {
    again = true;
    return running;
  }
  const { householdId } = active;
  setStatus({ ...status, state: 'syncing' });
  running = (async () => {
    try {
      await push(householdId);
      await pull(householdId);
      setStatus({ state: 'idle', lastSyncedAt: new Date().toISOString() });
    } catch (error) {
      setStatus({ ...status, state: 'error', error: error instanceof Error ? error.message : String(error) });
    } finally {
      running = undefined;
      if (again && active) {
        again = false;
        void syncNow();
      }
    }
  })();
  return running;
}

function schedulePush() {
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => void syncNow(), 1500);
}

export function startSync(householdId: string) {
  if (!supabase) return;
  if (active?.householdId === householdId) return;
  stopSync();

  const offLocal = onLocalChange((change) => {
    queue('items', change.items, change.deletedItems);
    queue('events', change.events, change.deletedEvents);
    schedulePush();
  });
  const offRestock = onRestockChange((change) => {
    queue('restock', change.entries, change.deleted);
    schedulePush();
  });
  const onForeground = AppState.addEventListener('change', (state) => {
    if (state === 'active') void syncNow();
  });

  let channel: RealtimeChannel | undefined = supabase.channel(`household-${householdId}`);
  for (const table of Object.values(TABLES)) {
    channel = channel.on('postgres_changes', { event: '*', schema: 'public', table, filter: `household_id=eq.${householdId}` }, () => schedulePush());
  }
  channel.subscribe();

  active = {
    householdId,
    stop: () => {
      offLocal();
      offRestock();
      onForeground.remove();
      if (channel) void supabase?.removeChannel(channel);
    },
  };
  setStatus({ state: 'idle' });
  void syncNow();
}

export function stopSync() {
  active?.stop();
  active = undefined;
  clearTimeout(pushTimer);
  setStatus({ state: 'off' });
}

/** Leaving a household: the local copy stays, pending uploads and pull positions are dropped. */
export function forgetHousehold() {
  stopSync();
  outbox = emptyOutbox();
  saveOutbox();
  resetCursors();
}
