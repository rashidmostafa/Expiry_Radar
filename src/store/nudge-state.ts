import { useSyncExternalStore } from 'react';

import { getValue, setValue } from './persistence';

/** Which smart nudges the user has seen, dismissed or snoozed. */
type State = {
  /** Nudge id → ISO time it may reappear ("forever" when dismissed). */
  hidden: Record<string, string>;
  seen: string[];
};

const KEY = 'nudges';
let state: State = { hidden: {}, seen: [], ...getValue<State>(KEY) };
const listeners = new Set<() => void>();

function emit(next: State) {
  state = next;
  setValue(KEY, state);
  listeners.forEach((listener) => listener());
}

const getState = () => state;

export function useNudgeState() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getState,
    getState
  );
}

export function isHidden(id: string, nudgeState: State = state, now = new Date().toISOString()) {
  const until = nudgeState.hidden[id];
  return until === 'forever' || (!!until && until > now);
}

export function dismissNudge(id: string) {
  emit({ ...state, hidden: { ...state.hidden, [id]: 'forever' } });
}

export function snoozeNudge(id: string, hours: number) {
  emit({ ...state, hidden: { ...state.hidden, [id]: new Date(Date.now() + hours * 3_600_000).toISOString() } });
}

export function markNudgesSeen(ids: string[]) {
  const fresh = ids.filter((id) => !state.seen.includes(id));
  // Keep the list bounded; old ids belong to items long gone.
  if (fresh.length) emit({ ...state, seen: [...state.seen, ...fresh].slice(-300) });
}
