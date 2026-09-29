import { useSyncExternalStore } from 'react';

import { getValue, setValue } from './persistence';

export type ThemePreference = 'system' | 'light' | 'dark';

export type Settings = {
  theme: ThemePreference;
  /** First name for the home greeting. */
  userName: string;
  /** Bundled image key or photo URI. */
  avatar?: string;
  /** Nudge this many days before an item expires. Stitch default: 2. */
  alertDaysBefore: number;
  /** Hour of day (0–23) nudges are delivered. */
  alertHour: number;
  /** Bookmarked recipe ids. */
  savedRecipes: string[];
  /** Set once the demo pantry has been offered, so it never reappears after clearing. */
  seeded: boolean;
};

const defaults: Settings = {
  theme: 'system',
  userName: '',
  alertDaysBefore: 2,
  alertHour: 8,
  savedRecipes: [],
  seeded: false,
};

const KEY = 'settings';

let settings: Settings = { ...defaults, ...getValue<Partial<Settings>>(KEY) };
const listeners = new Set<() => void>();

export function getSettings() {
  return settings;
}

export function updateSettings(patch: Partial<Settings>) {
  settings = { ...settings, ...patch };
  setValue(KEY, settings);
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSettings() {
  return useSyncExternalStore(subscribe, getSettings, getSettings);
}

export function toggleSavedRecipe(id: string) {
  const saved = settings.savedRecipes;
  updateSettings({ savedRecipes: saved.includes(id) ? saved.filter((entry) => entry !== id) : [...saved, id] });
}
