import { useSyncExternalStore } from 'react';

import type { NewPantryItem } from '@/domain/types';

/** Items captured in the current scan, waiting for review before they enter the pantry. */
export type ScanEntry = {
  key: string;
  draft: NewPantryItem;
  selected: boolean;
  /** Filtered out as non-food (receipt smart filter). */
  excluded?: boolean;
  /** Barcode not found in the product database; needs a name. */
  unknown?: boolean;
};

export type ScanSession = {
  source: 'barcode' | 'receipt';
  store?: string;
  date?: string;
  entries: ScanEntry[];
};

const empty: ScanSession = { source: 'barcode', entries: [] };
let session: ScanSession = empty;
const listeners = new Set<() => void>();

function emit(next: ScanSession) {
  session = next;
  listeners.forEach((listener) => listener());
}

let counter = 0;
export const entryKey = () => `scan-${Date.now()}-${counter++}`;

export function startSession(next: Omit<ScanSession, 'entries'> & { entries?: ScanEntry[] }) {
  emit({ entries: [], ...next });
}

export function addEntry(entry: ScanEntry) {
  emit({ ...session, entries: [entry, ...session.entries] });
}

export function updateEntry(key: string, patch: Omit<Partial<ScanEntry>, 'draft'> & { draft?: Partial<NewPantryItem> }) {
  emit({
    ...session,
    entries: session.entries.map((entry) =>
      entry.key === key ? { ...entry, ...patch, draft: { ...entry.draft, ...patch.draft } } : entry
    ),
  });
}

export function removeEntry(key: string) {
  emit({ ...session, entries: session.entries.filter((entry) => entry.key !== key) });
}

export function clearSession() {
  emit(empty);
}

export function getSession() {
  return session;
}

export function useScanSession() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSession,
    getSession
  );
}
