import { randomUUID } from 'expo-crypto';

import { addDays, today } from '@/domain/dates';
import type { ItemEvent, NewPantryItem } from '@/domain/types';

import { addItems, draftFromName, importEvents } from './pantry';
import { getSettings, updateSettings } from './settings';

type SeedRow = [name: string, detail: string, expiresIn: number, extra?: Partial<NewPantryItem>];

/** The kitchen from the Stitch mockups, dated relative to today. */
const kitchen: SeedRow[] = [
  ['Baby Spinach (Organic)', 'Earthbound Farm • 16 oz', 1, { quantity: 1, unit: 'bag', priceCents: 399, openedOn: addDays(today(), -2) }],
  ['Strawberries', '1 lb box', 2, { unit: 'box' }],
  ['Greek Yogurt', 'Chobani Plain 32oz', 3, { remainingPct: 50, unit: 'tub' }],
  ['Ripe Avocados', '2 ct', 3, { quantity: 2, unit: 'units' }],
  ['Whole Milk', '½ gallon', 4, { unit: 'carton' }],
  ['Sourdough Loaf', '6 slices left', 5, { remainingPct: 60, unit: 'loaf' }],
  ['Almond Milk', 'Silk Unsweetened', 6, { remainingPct: 80, unit: 'carton' }],
  ['Goat Cheese', 'Chèvre • 4 oz', 9, { openedOn: addDays(today(), -2) }],
  ['Pasture-Raised Eggs', '12 pk', 12, { quantity: 12, unit: 'eggs' }],
  ['Honeycrisp Apples', '3 lb bag', 24],
  ['Limes', '4 ct', 20, { quantity: 4, unit: 'units' }],
  ['Chicken Breast (Organic)', '1.2 lbs • Unopened', 28, { zone: 'freezer', shelf: 'Drawer 1' }],
  ['Frozen Peas', '16 oz bag', 120, { category: 'frozen', zone: 'freezer' }],
  ['Frozen Blueberries', '32 oz bag', 150, { category: 'frozen', zone: 'freezer' }],
  ['Butternut Squash', '1 medium', 30],
  ['Garlic', '1 bulb', 60],
  ['Marinara Pasta Sauce', '24 oz jar', 300],
  ['Extra Virgin Olive Oil', '500 ml', 400],
];

/** Last few weeks of rescues so stats have history. */
const history: [name: string, daysAgo: number, cents: number, grams: number][] = [
  ['Rotisserie Chicken', 3, 899, 900],
  ['Cheddar Block', 5, 599, 227],
  ['Greek Yogurt', 8, 429, 907],
  ['Mixed Greens', 9, 349, 300],
  ['Salmon Fillet', 11, 1199, 454],
  ['Blueberries', 12, 699, 340],
];

export function seedDemoKitchen() {
  if (getSettings().seeded) return;
  updateSettings({ seeded: true, userName: getSettings().userName || 'Sarah', avatar: 'avatar' });

  addItems(
    kitchen.map(([name, detail, expiresIn, extra]) =>
      draftFromName(name, {
        detail,
        purchasedOn: addDays(today(), -Math.min(4, Math.max(1, Math.round(expiresIn / 3)))),
        ...extra,
        expiresOn: addDays(today(), expiresIn),
      })
    )
  );

  const events: ItemEvent[] = history.map(([itemName, daysAgo, valueCents, grams]) => ({
    id: randomUUID(),
    itemId: randomUUID(),
    itemName,
    type: 'used',
    fraction: 1,
    valueCents,
    grams,
    at: new Date(Date.now() - daysAgo * 86_400_000).toISOString(),
  }));
  importEvents(events);
}
