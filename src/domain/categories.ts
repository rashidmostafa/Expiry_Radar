import type { CategoryId, Zone } from './types';

export type ShelfLife = { min: number; max: number };

type CategoryDef = {
  id: CategoryId;
  label: string;
  /** Short uppercase label used on cards (Stitch: "PRODUCE", "DAIRY"). */
  short: string;
  emoji: string;
  zone: Zone;
  /** Days of peak quality per storage zone (USDA FoodKeeper-style ranges). */
  shelfLife: Record<Zone, ShelfLife>;
  /** Phrase for the Smart Shelf-Life card, e.g. "Fresh dairy". */
  noun: string;
};

export const categories: Record<CategoryId, CategoryDef> = {
  produce: {
    id: 'produce',
    label: 'Produce',
    short: 'Produce',
    emoji: '🥗',
    zone: 'fridge',
    noun: 'Fresh produce',
    shelfLife: { fridge: { min: 5, max: 7 }, pantry: { min: 3, max: 5 }, freezer: { min: 240, max: 365 } },
  },
  dairy: {
    id: 'dairy',
    label: 'Dairy & Eggs',
    short: 'Dairy',
    emoji: '🥛',
    zone: 'fridge',
    noun: 'Fresh dairy',
    shelfLife: { fridge: { min: 7, max: 10 }, pantry: { min: 1, max: 1 }, freezer: { min: 60, max: 90 } },
  },
  proteins: {
    id: 'proteins',
    label: 'Proteins',
    short: 'Protein',
    emoji: '🥩',
    zone: 'fridge',
    noun: 'Fresh meat & fish',
    shelfLife: { fridge: { min: 2, max: 3 }, pantry: { min: 0, max: 0 }, freezer: { min: 120, max: 270 } },
  },
  pantry: {
    id: 'pantry',
    label: 'Pantry',
    short: 'Pantry',
    emoji: '🥫',
    zone: 'pantry',
    noun: 'Shelf-stable food',
    shelfLife: { fridge: { min: 30, max: 60 }, pantry: { min: 180, max: 365 }, freezer: { min: 180, max: 365 } },
  },
  frozen: {
    id: 'frozen',
    label: 'Frozen',
    short: 'Frozen',
    emoji: '❄️',
    zone: 'freezer',
    noun: 'Frozen food',
    shelfLife: { fridge: { min: 2, max: 3 }, pantry: { min: 0, max: 0 }, freezer: { min: 90, max: 180 } },
  },
  bakery: {
    id: 'bakery',
    label: 'Bakery',
    short: 'Bakery',
    emoji: '🍞',
    zone: 'pantry',
    noun: 'Fresh bread',
    shelfLife: { fridge: { min: 7, max: 10 }, pantry: { min: 3, max: 5 }, freezer: { min: 60, max: 90 } },
  },
  beverages: {
    id: 'beverages',
    label: 'Beverages',
    short: 'Drinks',
    emoji: '🧃',
    zone: 'fridge',
    noun: 'A chilled drink',
    shelfLife: { fridge: { min: 7, max: 10 }, pantry: { min: 180, max: 365 }, freezer: { min: 60, max: 90 } },
  },
  other: {
    id: 'other',
    label: 'Other',
    short: 'Other',
    emoji: '🧺',
    zone: 'pantry',
    noun: 'Most food',
    shelfLife: { fridge: { min: 7, max: 14 }, pantry: { min: 30, max: 60 }, freezer: { min: 90, max: 180 } },
  },
};

/** Order of the chips on the Add Item screen. */
export const categoryOrder: CategoryId[] = [
  'produce',
  'dairy',
  'proteins',
  'pantry',
  'frozen',
  'bakery',
  'beverages',
];

export const zones: Record<Zone, { label: string; icon: 'kitchen' | 'ac_unit' | 'shelves' }> = {
  fridge: { label: 'Fridge', icon: 'kitchen' },
  freezer: { label: 'Freezer', icon: 'ac_unit' },
  pantry: { label: 'Pantry', icon: 'shelves' },
};

export const zoneOrder: Zone[] = ['fridge', 'freezer', 'pantry'];

export const zoneClimate: Record<Zone, string> = {
  fridge: 'in standard refrigeration (38°F)',
  freezer: 'frozen at 0°F',
  pantry: 'in a cool, dry pantry',
};
