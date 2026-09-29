import { randomUUID } from 'expo-crypto';

import { addDays, today } from '@/domain/dates';
import type { CategoryId, ItemEvent, NewPantryItem } from '@/domain/types';

import { addItems, draftFromName, importEvents, markUsed } from './pantry';
import { getSettings, updateSettings } from './settings';

type SeedRow = [name: string, detail: string, expiresIn: number, extra?: Partial<NewPantryItem>];

/** The kitchen from the Stitch mockups, dated relative to today. */
const kitchen: SeedRow[] = [
  ['Baby Spinach (Organic)', 'Earthbound Farm • 16 oz', 1, { quantity: 1, unit: 'bag', priceCents: 399, openedOn: addDays(today(), -2) }],
  ['Strawberries', '1 lb box', 2, { unit: 'box' }],
  ['Salmon Fillet', 'Wild • 12 oz', 2, { unit: 'pack', purchasedOn: addDays(today(), -3) }],
  ['Greek Yogurt', 'Chobani Plain 32oz', 3, { remainingPct: 50, unit: 'tub' }],
  ['Ripe Avocados', '2 ct', 3, { quantity: 2, unit: 'units' }],
  ['Whole Milk', '½ gallon', 4, { unit: 'carton' }],
  ['Sourdough Loaf', '6 slices left', 5, { remainingPct: 60, unit: 'loaf' }],
  ['Almond Milk', 'Silk Unsweetened', 6, { remainingPct: 80, unit: 'carton' }],
  ['Marinara Pasta Sauce', "Rao's • opened jar", 6, { zone: 'fridge', remainingPct: 60, openedOn: addDays(today(), -1) }],
  ['Goat Cheese', 'Chèvre • 4 oz', 9, { openedOn: addDays(today(), -2) }],
  ['Pasture-Raised Eggs', '12 pk', 12, { quantity: 12, unit: 'eggs' }],
  ['Honeycrisp Apples', '3 lb bag', 24],
  ['Limes', '4 ct', 20, { quantity: 4, unit: 'units' }],
  ['Chicken Breast (Organic)', '1.2 lbs • Unopened', 28, { zone: 'freezer', shelf: 'Drawer 1' }],
  ['Frozen Peas', '16 oz bag', 120, { category: 'frozen', zone: 'freezer' }],
  ['Frozen Blueberries', '32 oz bag', 150, { category: 'frozen', zone: 'freezer' }],
  ['Butternut Squash', '1 medium', 30],
  ['Garlic', '1 bulb', 60],
  ['Marinara Pasta Sauce', 'Barilla • 24 oz jar', 300],
  ['Extra Virgin Olive Oil', '500 ml', 400],
];

type Food = [name: string, category: CategoryId, cents: number, grams: number, recipeId?: string];

/** What a typical household rescues (and occasionally loses) over a few months. */
const pantryHistory: Food[] = [
  ['Baby Spinach', 'produce', 399, 454, 'spinach-goat-cheese-frittata'],
  ['Greek Yogurt', 'dairy', 429, 907, 'strawberry-yogurt-parfait'],
  ['Hass Avocados', 'produce', 350, 450, 'lime-guacamole'],
  ['Pasture-Raised Eggs', 'dairy', 580, 680, 'sourdough-french-toast-bake'],
  ['Strawberries', 'produce', 449, 454],
  ['Mixed Greens', 'produce', 349, 300],
  ['Cheddar Block', 'dairy', 599, 227],
  ['Rotisserie Chicken', 'proteins', 899, 900],
  ['Salmon Fillet', 'proteins', 1199, 454],
  ['Sourdough Loaf', 'bakery', 599, 680, 'sourdough-french-toast-bake'],
  ['Whole Milk', 'dairy', 349, 1890],
  ['Blueberries', 'produce', 499, 340],
  ['Butternut Squash', 'produce', 299, 1000, 'roasted-squash-apple'],
  ['Bananas', 'produce', 179, 600, 'green-boost-smoothie'],
];

/** Small deterministic PRNG so the demo history is identical on every device. */
function random(seed: number) {
  let value = seed;
  return () => {
    value = (value * 1_103_515_245 + 12_345) % 2_147_483_648;
    return value / 2_147_483_648;
  };
}

function demoHistory(): ItemEvent[] {
  const next = random(42);
  const events: ItemEvent[] = [];
  const DAY = 86_400_000;
  for (let daysAgo = 120; daysAgo >= 1; daysAgo--) {
    const perDay = next() < 0.55 ? 1 : next() < 0.5 ? 2 : 0;
    for (let n = 0; n < perDay; n++) {
      const [itemName, category, cents, grams, recipeId] = pantryHistory[Math.floor(next() * pantryHistory.length)];
      // A few losses early on, then a clean streak for the last 12 days.
      const tossed = daysAgo > 12 && next() < 0.08;
      const daysLeft = tossed ? -Math.ceil(next() * 4) : Math.floor(next() * 5);
      const fraction = tossed ? 0.6 : 1;
      events.push({
        id: randomUUID(),
        itemId: randomUUID(),
        itemName,
        type: tossed ? 'tossed' : 'used',
        fraction,
        valueCents: Math.round(cents * fraction),
        grams: Math.round(grams * fraction),
        at: new Date(Date.now() - daysAgo * DAY + Math.floor(next() * 10) * 3_600_000).toISOString(),
        category,
        daysLeft,
        recipeId: !tossed && recipeId && next() < 0.6 ? recipeId : undefined,
      });
    }
  }
  return events;
}

/** Loads the mockup kitchen and a few months of history. `force` reloads after a wipe. */
export function seedDemoKitchen(force = false) {
  if (getSettings().seeded && !force) return;
  updateSettings({ seeded: true, userName: getSettings().userName || 'Sarah', avatar: getSettings().avatar ?? 'avatar' });

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
  // Something just finished, so restock suggestions have an example.
  const [butter] = addItems([draftFromName('Unsalted Butter', { detail: '1 lb', purchasedOn: addDays(today(), -20) })]);
  markUsed(butter.id);

  importEvents(demoHistory());
}
