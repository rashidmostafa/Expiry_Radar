import { useSyncExternalStore } from 'react';

import type { CategoryId, Zone } from '@/domain/types';

import { getValue, setValue } from './persistence';

export type ThemePreference = 'system' | 'light' | 'dark';

export type DietId = 'vegetarian' | 'vegan' | 'gluten-free' | 'dairy-free' | 'pescatarian' | 'nut-free';

export type NudgeType = 'expiry' | 'duplicates' | 'recipes' | 'weekly' | 'shelfLife' | 'patterns';

export type RecipeRating = { stars: number; tags: string[]; at: string };

export type Settings = {
  theme: ThemePreference;
  /** First name for the home greeting. */
  userName: string;
  handle: string;
  bio: string;
  /** Bundled image key or photo URI. */
  avatar?: string;
  /** Finished the welcome walkthrough + household quiz. */
  onboarded: boolean;
  /** People eating from this pantry (default recipe portions). */
  householdSize: number;
  diets: DietId[];
  /** Nudge this many days before an item expires. Stitch default: 2. */
  alertDaysBefore: number;
  /** Hour of day (0–23) expiry nudges are delivered. */
  alertHour: number;
  nudgeTypes: Record<NudgeType, boolean>;
  /** Minutes after midnight. */
  quietHours: { enabled: boolean; from: number; to: number };
  /** Morning digest time in minutes after midnight; null turns it off. */
  digestAt: number | null;
  /** "Evening cook nudge" at 5:30 PM on days something needs using. */
  eveningNudge: boolean;
  units: 'imperial' | 'metric';
  /** Per-category storage zone the user chose (Pantry Settings → Auto-Zone Rules). */
  zoneDefaults: Partial<Record<CategoryId, Zone>>;
  /** Bookmarked recipe ids. */
  savedRecipes: string[];
  recipeRatings: Record<string, RecipeRating>;
  /** Set once the demo pantry has been loaded, so it never reappears after clearing. */
  seeded: boolean;
};

export const defaultSettings: Settings = {
  theme: 'system',
  userName: '',
  handle: '',
  bio: '',
  onboarded: false,
  householdSize: 2,
  diets: [],
  alertDaysBefore: 2,
  alertHour: 8,
  nudgeTypes: { expiry: true, duplicates: true, recipes: true, weekly: true, shelfLife: true, patterns: true },
  quietHours: { enabled: true, from: 22 * 60, to: 7 * 60 + 30 },
  digestAt: 8 * 60 + 30,
  eveningNudge: true,
  units: 'imperial',
  zoneDefaults: {},
  savedRecipes: [],
  recipeRatings: {},
  seeded: false,
};

const KEY = 'settings';

const stored = getValue<Partial<Settings>>(KEY);
let settings: Settings = {
  ...defaultSettings,
  ...stored,
  nudgeTypes: { ...defaultSettings.nudgeTypes, ...stored?.nudgeTypes },
  quietHours: { ...defaultSettings.quietHours, ...stored?.quietHours },
};
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

export function rateRecipe(id: string, rating: Omit<RecipeRating, 'at'>) {
  updateSettings({ recipeRatings: { ...settings.recipeRatings, [id]: { ...rating, at: new Date().toISOString() } } });
}

/** "8:30 AM" */
export function formatClock(minutes: number) {
  const hour = Math.floor(minutes / 60) % 24;
  const minute = minutes % 60;
  return `${hour % 12 === 0 ? 12 : hour % 12}:${String(minute).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`;
}

/** Whether a moment falls inside quiet hours (handles ranges that cross midnight). */
export function inQuietHours(date: Date, quiet = settings.quietHours) {
  if (!quiet.enabled) return false;
  const minutes = date.getHours() * 60 + date.getMinutes();
  return quiet.from <= quiet.to ? minutes >= quiet.from && minutes < quiet.to : minutes >= quiet.from || minutes < quiet.to;
}
