import { categories, type ShelfLife } from './categories';
import type { CategoryId, Zone } from './types';

/**
 * Common groceries the app recognizes by name (manual entry, barcode titles, receipt lines).
 * Used for shelf-life defaults, category/zone guesses, recipe matching and savings estimates.
 */
export type FoodProfile = {
  /** Stable ingredient key shared with recipes. */
  key: string;
  pattern: RegExp;
  category: CategoryId;
  zone: Zone;
  shelfLife?: Partial<Record<Zone, ShelfLife>>;
  /** Bundled photo (assets/images/food). */
  image?: string;
  /** Tile glyph when there's no photo. */
  emoji?: string;
  shelf?: string;
  /** Typical shelf price and weight, for savings estimates when the receipt has none. */
  priceCents: number;
  grams: number;
  tip?: string;
};

export const foods: FoodProfile[] = [
  {
    key: 'spinach',
    pattern: /spinach/i,
    category: 'produce',
    zone: 'fridge',
    shelf: 'Crisper Drawer',
    shelfLife: { fridge: { min: 3, max: 5 } },
    image: 'spinach',
    priceCents: 399,
    grams: 454,
    tip: 'Slip a folded dry paper towel inside the clamshell. It absorbs excess moisture and buys 3 extra days of crisp leaves.',
  },
  {
    key: 'greens',
    emoji: '🥬',
    pattern: /lettuce|romaine|arugula|kale|mixed greens|salad/i,
    category: 'produce',
    zone: 'fridge',
    shelf: 'Crisper Drawer',
    shelfLife: { fridge: { min: 3, max: 5 } },
    priceCents: 349,
    grams: 300,
    tip: 'Wrap greens loosely in a towel and keep them in the crisper to slow wilting.',
  },
  {
    key: 'strawberries',
    pattern: /strawberr/i,
    category: 'produce',
    zone: 'fridge',
    shelfLife: { fridge: { min: 3, max: 5 } },
    image: 'strawberries',
    priceCents: 449,
    grams: 454,
    tip: 'Rinse berries only right before eating — moisture speeds up mold.',
  },
  {
    key: 'berries',
    emoji: '🫐',
    pattern: /blueberr|raspberr|blackberr|berries/i,
    category: 'produce',
    zone: 'fridge',
    shelfLife: { fridge: { min: 3, max: 6 } },
    priceCents: 499,
    grams: 340,
  },
  {
    key: 'avocado',
    pattern: /avocado/i,
    category: 'produce',
    zone: 'pantry',
    shelf: 'Fruit Bowl',
    shelfLife: { pantry: { min: 3, max: 4 }, fridge: { min: 5, max: 7 } },
    image: 'avocados',
    priceCents: 350,
    grams: 450,
    tip: 'Once ripe, move avocados to the fridge to extend them by up to 4 days.',
  },
  {
    key: 'banana',
    emoji: '🍌',
    pattern: /banana/i,
    category: 'produce',
    zone: 'pantry',
    shelf: 'Fruit Bowl',
    shelfLife: { pantry: { min: 3, max: 5 }, freezer: { min: 60, max: 90 } },
    priceCents: 179,
    grams: 600,
    tip: 'Peel and freeze spotty bananas for smoothies and baking.',
  },
  {
    key: 'apple',
    emoji: '🍎',
    pattern: /apple(?!\s*juice)/i,
    category: 'produce',
    zone: 'fridge',
    shelfLife: { fridge: { min: 21, max: 42 }, pantry: { min: 7, max: 14 } },
    priceCents: 399,
    grams: 900,
  },
  {
    key: 'tomato',
    emoji: '🍅',
    pattern: /tomato(?!.*sauce)/i,
    category: 'produce',
    zone: 'pantry',
    shelf: 'Counter',
    shelfLife: { pantry: { min: 5, max: 7 }, fridge: { min: 7, max: 10 } },
    priceCents: 299,
    grams: 500,
  },
  {
    key: 'lime',
    emoji: '🍋',
    pattern: /\blimes?\b|lemon/i,
    category: 'produce',
    zone: 'fridge',
    shelfLife: { fridge: { min: 21, max: 28 }, pantry: { min: 7, max: 10 } },
    priceCents: 99,
    grams: 70,
  },
  {
    key: 'onion',
    emoji: '🧅',
    pattern: /onion|shallot/i,
    category: 'produce',
    zone: 'pantry',
    shelfLife: { pantry: { min: 30, max: 60 } },
    priceCents: 129,
    grams: 250,
  },
  {
    key: 'garlic',
    emoji: '🧄',
    pattern: /garlic/i,
    category: 'produce',
    zone: 'pantry',
    shelfLife: { pantry: { min: 60, max: 150 } },
    priceCents: 79,
    grams: 50,
  },
  {
    key: 'potato',
    emoji: '🥔',
    pattern: /potato/i,
    category: 'produce',
    zone: 'pantry',
    shelfLife: { pantry: { min: 21, max: 35 } },
    priceCents: 399,
    grams: 2200,
  },
  {
    key: 'squash',
    emoji: '🎃',
    pattern: /squash|pumpkin/i,
    category: 'produce',
    zone: 'pantry',
    shelfLife: { pantry: { min: 30, max: 90 } },
    priceCents: 299,
    grams: 1000,
  },
  {
    key: 'herbs',
    emoji: '🌿',
    pattern: /cilantro|parsley|basil|mint|rosemary|thyme|dill|chives/i,
    category: 'produce',
    zone: 'fridge',
    shelfLife: { fridge: { min: 5, max: 7 } },
    priceCents: 199,
    grams: 30,
    tip: 'Stand soft herbs in a glass of water in the fridge, like a bouquet.',
  },
  {
    key: 'eggs',
    pattern: /\beggs?\b/i,
    category: 'dairy',
    zone: 'fridge',
    shelf: 'Top Shelf',
    shelfLife: { fridge: { min: 21, max: 35 } },
    image: 'eggs',
    priceCents: 580,
    grams: 680,
  },
  {
    key: 'yogurt',
    pattern: /yogh?urt/i,
    category: 'dairy',
    zone: 'fridge',
    shelfLife: { fridge: { min: 7, max: 14 } },
    image: 'greek-yogurt',
    priceCents: 429,
    grams: 907,
  },
  {
    key: 'almond-milk',
    pattern: /almond milk|oat milk|soy milk|plant milk/i,
    category: 'beverages',
    zone: 'fridge',
    shelfLife: { fridge: { min: 7, max: 10 } },
    image: 'almond-milk',
    priceCents: 399,
    grams: 1890,
  },
  {
    key: 'milk',
    pattern: /\bmilk\b/i,
    category: 'dairy',
    zone: 'fridge',
    shelf: 'Door',
    shelfLife: { fridge: { min: 5, max: 7 } },
    image: 'whole-milk',
    priceCents: 349,
    grams: 1890,
  },
  {
    key: 'goat-cheese',
    emoji: '🧀',
    pattern: /goat cheese|ch[eè]vre|feta|ricotta|mozzarella|cream cheese/i,
    category: 'dairy',
    zone: 'fridge',
    shelf: 'Dairy Bin',
    shelfLife: { fridge: { min: 7, max: 14 } },
    priceCents: 549,
    grams: 113,
  },
  {
    key: 'cheese',
    emoji: '🧀',
    pattern: /cheese|cheddar|parmesan|gouda/i,
    category: 'dairy',
    zone: 'fridge',
    shelf: 'Dairy Bin',
    shelfLife: { fridge: { min: 21, max: 42 } },
    priceCents: 599,
    grams: 227,
  },
  {
    key: 'butter',
    emoji: '🧈',
    pattern: /butter(?!milk)/i,
    category: 'dairy',
    zone: 'fridge',
    shelfLife: { fridge: { min: 30, max: 90 } },
    priceCents: 499,
    grams: 454,
  },
  {
    key: 'chicken',
    pattern: /chicken|turkey/i,
    category: 'proteins',
    zone: 'fridge',
    shelfLife: { fridge: { min: 1, max: 2 }, freezer: { min: 180, max: 270 } },
    image: 'chicken-breast',
    priceCents: 899,
    grams: 545,
  },
  {
    key: 'meat',
    emoji: '🥩',
    pattern: /beef|steak|pork|lamb|ground|sausage|bacon/i,
    category: 'proteins',
    zone: 'fridge',
    shelfLife: { fridge: { min: 2, max: 4 }, freezer: { min: 120, max: 180 } },
    priceCents: 999,
    grams: 454,
  },
  {
    key: 'fish',
    emoji: '🐟',
    pattern: /salmon|fish|tuna steak|cod|shrimp|prawn/i,
    category: 'proteins',
    zone: 'fridge',
    shelfLife: { fridge: { min: 1, max: 2 }, freezer: { min: 90, max: 180 } },
    priceCents: 1199,
    grams: 454,
  },
  {
    key: 'tofu',
    emoji: '🫘',
    pattern: /tofu|tempeh/i,
    category: 'proteins',
    zone: 'fridge',
    shelfLife: { fridge: { min: 5, max: 7 } },
    priceCents: 299,
    grams: 396,
  },
  {
    key: 'bread',
    pattern: /bread|sourdough|loaf|baguette|bagel|bun|tortilla/i,
    category: 'bakery',
    zone: 'pantry',
    shelf: 'Bread Box',
    shelfLife: { pantry: { min: 4, max: 5 }, freezer: { min: 60, max: 90 } },
    image: 'sourdough',
    priceCents: 599,
    grams: 680,
    tip: 'Slice and freeze bread you won’t finish — toast straight from frozen.',
  },
  {
    key: 'pasta-sauce',
    emoji: '🥫',
    pattern: /marinara|pasta sauce|tomato sauce/i,
    category: 'pantry',
    zone: 'pantry',
    shelfLife: { pantry: { min: 180, max: 365 }, fridge: { min: 5, max: 7 } },
    priceCents: 449,
    grams: 680,
  },
  {
    key: 'olive-oil',
    emoji: '🫒',
    pattern: /olive oil/i,
    category: 'pantry',
    zone: 'pantry',
    shelfLife: { pantry: { min: 365, max: 540 } },
    priceCents: 999,
    grams: 500,
  },
];

/**
 * Packaged products are matched before fresh ingredients so a flavor doesn't win:
 * "Greek Yogurt Strawberry" is yogurt, "Banana Bread" is bread, "Tomato Sauce" is sauce.
 */
const PRODUCT_FIRST: CategoryId[] = ['dairy', 'bakery', 'pantry', 'beverages'];
const matchOrder = [...foods].sort(
  (a, b) => Number(!PRODUCT_FIRST.includes(a.category)) - Number(!PRODUCT_FIRST.includes(b.category))
);

/** Best matching profile for a free-text grocery name. */
export function findFood(name: string): FoodProfile | undefined {
  return matchOrder.find((food) => food.pattern.test(name));
}

export function shelfLifeFor(category: CategoryId, zone: Zone, food?: FoodProfile): ShelfLife {
  return food?.shelfLife?.[zone] ?? categories[category].shelfLife[zone];
}

/** Category/zone suggestion for a name, falling back to "other". */
export function guessFromName(name: string) {
  const food = findFood(name);
  const category = food?.category ?? 'other';
  return { food, category, zone: food?.zone ?? categories[category].zone };
}
