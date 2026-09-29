import type { IconName } from '@/components/ui/icon';

export type RecipeIngredient = {
  /** Food key from domain/foods — how the pantry is matched. */
  key: string;
  name: string;
  amount: string;
  /** Share of a tracked item used when cooking (0–1), for "Mark Cooked & Deduct Pantry". */
  deduct: number;
  /** Garnish / nice-to-have: doesn't count against pantry readiness. */
  optional?: boolean;
  /** Shown as "Staple" (oil, spices): usually on hand, cheap to restock. */
  staple?: boolean;
};

export type RecipeStep = { title: string; minutes: number; text: string; rescues?: string };

export type Recipe = {
  id: string;
  title: string;
  image: string;
  heroImage?: string;
  description: string;
  meal: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack' | 'Brunch' | 'Side';
  tags: string[];
  minutes: number;
  kcal: number;
  proteinGrams?: number;
  difficulty: 'Easy Prep' | 'Medium' | 'Weekend Project';
  servings: number;
  ingredients: RecipeIngredient[];
  tools: { icon: IconName; name: string }[];
  steps: RecipeStep[];
  tip: string;
};

export const recipes: Recipe[] = [
  {
    id: 'spinach-goat-cheese-frittata',
    title: 'Spinach & Goat Cheese Frittata',
    image: 'frittata',
    heroImage: 'frittata-hero',
    description: 'A golden skillet frittata that turns a bag of tired spinach into breakfast for two.',
    meal: 'Breakfast',
    tags: ['Quick', 'Vegetarian'],
    minutes: 15,
    kcal: 290,
    difficulty: 'Easy Prep',
    servings: 2,
    ingredients: [
      { key: 'spinach', name: 'Baby Spinach', amount: '2 cups', deduct: 0.5 },
      { key: 'eggs', name: 'Large Eggs', amount: '4 eggs', deduct: 0.34 },
      { key: 'goat-cheese', name: 'Goat Cheese', amount: '2 oz', deduct: 0.5 },
      { key: 'olive-oil', name: 'Extra Virgin Olive Oil', amount: '1 tbsp', deduct: 0.03, staple: true },
    ],
    tools: [
      { icon: 'skillet', name: '10-inch Oven-Safe Skillet' },
      { icon: 'flatware', name: 'Whisk & Bowl' },
      { icon: 'cookie', name: 'Spatula' },
    ],
    steps: [
      {
        title: 'Wilt the Spinach',
        minutes: 2,
        text: 'Heat 1 tbsp olive oil in the skillet over medium heat. Add the 2 cups of expiring baby spinach and toss gently for 90 seconds until vibrant emerald green and soft. Season with a pinch of sea salt and freshly cracked pepper.',
        rescues: 'spinach',
      },
      {
        title: 'Whisk & Pour Egg Base',
        minutes: 3,
        text: 'In a mixing bowl, whisk 4 eggs with 1 tbsp water or milk until completely uniform and lightly aerated. Pour evenly over the wilted spinach across the hot pan. Allow the edges to set undisturbed for 1 minute.',
      },
      {
        title: 'Dot Goat Cheese & Bake',
        minutes: 6,
        text: 'Crumble 2 oz of goat cheese evenly across the top. Reduce stovetop heat to low and cover with a lid, or slide the oven-safe skillet into an oven preheated to 375°F (190°C) for 6–8 minutes until the center is just softly set and lightly puffed.',
      },
      {
        title: 'Rest, Slice & Plate',
        minutes: 2,
        text: 'Remove from heat and let rest for 2 minutes to settle the texture. Slice into warm golden wedges directly from the skillet. Garnish with cracked black pepper or fresh chives if desired.',
      },
    ],
    tip: "Don't discard thick spinach stems! Simply chop them finely and sauté them alongside the leaves. They soften beautifully into sweet, tender bites with zero kitchen scraps left behind.",
  },
  {
    id: 'green-boost-smoothie',
    title: 'Green Boost Energy Smoothie',
    image: 'green-smoothie',
    description: 'Smooth blend of fresh greens, cold yogurt & chia seeds.',
    meal: 'Breakfast',
    tags: ['Quick', 'No Cook'],
    minutes: 5,
    kcal: 240,
    difficulty: 'Easy Prep',
    servings: 1,
    ingredients: [
      { key: 'spinach', name: 'Baby Spinach', amount: '1 cup', deduct: 0.25 },
      { key: 'yogurt', name: 'Greek Yogurt', amount: '½ cup', deduct: 0.25 },
      { key: 'banana', name: 'Ripe Banana', amount: '1', deduct: 0.34 },
      { key: 'almond-milk', name: 'Almond Milk', amount: '1 cup', deduct: 0.15 },
      { key: 'chia', name: 'Chia Seeds', amount: '1 tbsp', deduct: 0, staple: true, optional: true },
    ],
    tools: [{ icon: 'blender', name: 'Blender' }],
    steps: [
      {
        title: 'Load the Blender',
        minutes: 1,
        text: 'Add the almond milk first, then the yogurt, banana and spinach. Liquids at the bottom help everything blend smoothly.',
        rescues: 'spinach',
      },
      {
        title: 'Blend Until Silky',
        minutes: 2,
        text: 'Blend on high for 45–60 seconds until completely smooth and bright green. Add a splash more milk if it is too thick.',
      },
      {
        title: 'Top & Serve',
        minutes: 1,
        text: 'Pour into a tall glass, sprinkle with chia seeds and drink right away while it is ice cold.',
      },
    ],
    tip: 'Freeze spotty bananas and wilting greens in a bag — they make the smoothie thicker and colder than ice ever could.',
  },
  {
    id: 'strawberry-yogurt-parfait',
    title: 'Strawberry Yogurt Parfait Bowl',
    image: 'yogurt-parfait',
    description: 'High-protein layered crunch with honey drizzle.',
    meal: 'Breakfast',
    tags: ['No Cook', 'Quick'],
    minutes: 7,
    kcal: 320,
    proteinGrams: 18,
    difficulty: 'Easy Prep',
    servings: 1,
    ingredients: [
      { key: 'strawberries', name: 'Strawberries', amount: '1 cup', deduct: 0.5 },
      { key: 'yogurt', name: 'Greek Yogurt', amount: '¾ cup', deduct: 0.3 },
      { key: 'granola', name: 'Granola', amount: '⅓ cup', deduct: 0, staple: true },
      { key: 'honey', name: 'Honey', amount: '1 tsp', deduct: 0, staple: true, optional: true },
    ],
    tools: [{ icon: 'local_bar', name: 'Tall Glass or Bowl' }],
    steps: [
      {
        title: 'Slice the Berries',
        minutes: 2,
        text: 'Hull and slice the strawberries. Softer berries are perfect here — they release their juice into the yogurt.',
        rescues: 'strawberries',
      },
      {
        title: 'Layer It Up',
        minutes: 3,
        text: 'Alternate spoonfuls of yogurt, strawberries and granola in a glass, finishing with berries on top.',
      },
      { title: 'Drizzle & Enjoy', minutes: 1, text: 'Finish with a thin drizzle of honey and eat right away for the best crunch.' },
    ],
    tip: 'Mash any very soft strawberries with a fork and swirl them into the yogurt layer for an instant compote.',
  },
  {
    id: 'lime-guacamole',
    title: 'Chunky Fresh Lime Guacamole',
    image: 'guacamole',
    description: 'Creamy hass avocados with sea salt, cilantro & lime juice.',
    meal: 'Snack',
    tags: ['Vegan', 'No Cook'],
    minutes: 10,
    kcal: 230,
    difficulty: 'Easy Prep',
    servings: 3,
    ingredients: [
      { key: 'avocado', name: 'Ripe Avocados', amount: '2', deduct: 1 },
      { key: 'lime', name: 'Lime', amount: '1', deduct: 0.5 },
      { key: 'onion', name: 'Red Onion', amount: '¼', deduct: 0.25 },
      { key: 'herbs', name: 'Fresh Cilantro', amount: '2 tbsp', deduct: 0.3, optional: true },
      { key: 'tomato', name: 'Tomato', amount: '1 small', deduct: 0.25, optional: true },
    ],
    tools: [
      { icon: 'soup_kitchen', name: 'Mortar or Bowl' },
      { icon: 'restaurant', name: 'Fork' },
    ],
    steps: [
      {
        title: 'Mash the Avocados',
        minutes: 3,
        text: 'Halve the avocados, scoop into a bowl or molcajete and mash with a fork, leaving it chunky.',
        rescues: 'avocado',
      },
      {
        title: 'Brighten with Lime',
        minutes: 2,
        text: 'Squeeze in the lime juice and add a big pinch of sea salt. The acid keeps the guacamole green.',
      },
      {
        title: 'Fold in Aromatics',
        minutes: 3,
        text: 'Finely dice the onion (and tomato, if using), chop the cilantro, and fold everything together. Taste and adjust salt and lime.',
      },
    ],
    tip: 'Press plastic wrap directly onto leftover guacamole before chilling — no air means no browning.',
  },
  {
    id: 'roasted-squash-apple',
    title: 'Roasted Squash & Honeycrisp Apple',
    image: 'squash-apple',
    description: 'Caramelized squash and apple chunks with fresh rosemary.',
    meal: 'Side',
    tags: ['Vegan', 'Sheet Pan'],
    minutes: 35,
    kcal: 210,
    difficulty: 'Easy Prep',
    servings: 4,
    ingredients: [
      { key: 'squash', name: 'Butternut Squash', amount: '1 small', deduct: 1 },
      { key: 'apple', name: 'Honeycrisp Apples', amount: '2', deduct: 0.34 },
      { key: 'olive-oil', name: 'Olive Oil', amount: '2 tbsp', deduct: 0.05, staple: true },
      { key: 'herbs', name: 'Fresh Rosemary', amount: '2 sprigs', deduct: 0.3, optional: true },
    ],
    tools: [{ icon: 'oven', name: 'Sheet Pan & Oven' }],
    steps: [
      {
        title: 'Cube & Toss',
        minutes: 8,
        text: 'Heat the oven to 425°F (220°C). Peel and cube the squash, core and chunk the apples, and toss both with olive oil, salt and chopped rosemary.',
        rescues: 'squash',
      },
      {
        title: 'Roast',
        minutes: 25,
        text: 'Spread in a single layer on a sheet pan and roast, flipping once, until the edges are deeply caramelized.',
      },
    ],
    tip: 'Save the squash seeds: rinse, dry, toss with oil and salt, and roast alongside for a crunchy snack.',
  },
  {
    id: 'sourdough-french-toast-bake',
    title: 'Sourdough French Toast Bake',
    image: 'french-toast-bake',
    description: 'Day-old sourdough soaked in custard and baked with berries.',
    meal: 'Brunch',
    tags: ['Make Ahead', 'Vegetarian'],
    minutes: 40,
    kcal: 380,
    difficulty: 'Medium',
    servings: 4,
    ingredients: [
      { key: 'bread', name: 'Sourdough Loaf', amount: '6 slices', deduct: 0.6 },
      { key: 'eggs', name: 'Eggs', amount: '4', deduct: 0.34 },
      { key: 'milk', name: 'Milk', amount: '1 cup', deduct: 0.13 },
      { key: 'strawberries', name: 'Fresh Berries', amount: '1 cup', deduct: 0.5, optional: true },
      { key: 'cinnamon', name: 'Cinnamon', amount: '1 tsp', deduct: 0, staple: true, optional: true },
    ],
    tools: [
      { icon: 'oven', name: 'Baking Dish & Oven' },
      { icon: 'flatware', name: 'Whisk & Bowl' },
    ],
    steps: [
      {
        title: 'Cube the Bread',
        minutes: 5,
        text: 'Tear or cube the sourdough into a buttered baking dish. Slightly stale bread soaks up custard best.',
        rescues: 'bread',
      },
      {
        title: 'Soak in Custard',
        minutes: 10,
        text: 'Whisk the eggs, milk and cinnamon, pour evenly over the bread, and press down gently. Let it soak for 10 minutes.',
      },
      {
        title: 'Bake Until Golden',
        minutes: 25,
        text: 'Scatter the berries on top and bake at 350°F (175°C) until puffed and golden. Dust with powdered sugar to serve.',
      },
    ],
    tip: 'Assemble it the night before and refrigerate — breakfast is ready by the time the oven heats up.',
  },
  {
    id: 'garlicky-sauteed-spinach',
    title: 'Garlicky Sautéed Spinach',
    image: 'garlic-spinach',
    description: 'A whole bag of spinach, wilted with toasted garlic and pine nuts.',
    meal: 'Side',
    tags: ['Quick', 'Vegan'],
    minutes: 8,
    kcal: 140,
    difficulty: 'Easy Prep',
    servings: 2,
    ingredients: [
      { key: 'spinach', name: 'Baby Spinach', amount: '1 bag', deduct: 1 },
      { key: 'garlic', name: 'Garlic', amount: '3 cloves', deduct: 0.25 },
      { key: 'olive-oil', name: 'Olive Oil', amount: '1 tbsp', deduct: 0.03, staple: true },
      { key: 'pine-nuts', name: 'Pine Nuts', amount: '2 tbsp', deduct: 0, staple: true, optional: true },
    ],
    tools: [{ icon: 'skillet', name: 'Large Skillet' }],
    steps: [
      {
        title: 'Toast the Garlic',
        minutes: 2,
        text: 'Warm the olive oil over medium heat, add thinly sliced garlic and pine nuts, and cook until just golden.',
      },
      {
        title: 'Wilt the Spinach',
        minutes: 3,
        text: 'Add the spinach in handfuls, tossing until it all collapses. Season with salt and a squeeze of lemon.',
        rescues: 'spinach',
      },
    ],
    tip: 'A whole bag cooks down to two servings — the fastest way to rescue greens on their last day.',
  },
];

export function getRecipe(id: string) {
  return recipes.find((recipe) => recipe.id === id);
}

export function recipesUsing(foodKey: string) {
  return recipes.filter((recipe) => recipe.ingredients.some((ingredient) => ingredient.key === foodKey));
}
