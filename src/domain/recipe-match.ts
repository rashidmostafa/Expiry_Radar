import type { Recipe, RecipeIngredient } from '@/data/recipes';

import { today } from './dates';
import { daysLeft, urgencyFor } from './expiry';
import { findFood } from './foods';
import type { PantryItem, Urgency } from './types';

export type IngredientMatch = {
  ingredient: RecipeIngredient;
  /** Soonest-expiring pantry item that covers this ingredient. */
  item?: PantryItem;
  urgency?: Urgency;
  days?: number;
};

export type RecipeMatch = {
  recipe: Recipe;
  ingredients: IngredientMatch[];
  /** Required ingredients found in the kitchen. */
  inKitchen: number;
  required: number;
  readyPct: number;
  /** Items that would otherwise expire soon (urgent/soon/expired) that this recipe uses. */
  rescues: IngredientMatch[];
  savesCents: number;
  savesGrams: number;
  score: number;
};

const URGENCY_WEIGHT: Record<Urgency, number> = { expired: 2, urgent: 10, soon: 5, fresh: 1 };

/** Groups active items by the food key they satisfy, soonest expiry first. */
export function indexPantry(items: PantryItem[]) {
  const byKey = new Map<string, PantryItem[]>();
  for (const item of items) {
    if (item.status !== 'active') continue;
    const key = findFood(item.name)?.key;
    if (!key) continue;
    byKey.set(key, [...(byKey.get(key) ?? []), item].sort((a, b) => a.expiresOn.localeCompare(b.expiresOn)));
  }
  return byKey;
}

export function matchRecipe(recipe: Recipe, pantry: Map<string, PantryItem[]>, now = today()): RecipeMatch {
  const ingredients = recipe.ingredients.map<IngredientMatch>((ingredient) => {
    const item = pantry.get(ingredient.key)?.[0];
    if (!item) return { ingredient };
    const days = daysLeft(item, now);
    return { ingredient, item, days, urgency: urgencyFor(days) };
  });
  const required = ingredients.filter((match) => !match.ingredient.optional);
  const inKitchen = required.filter((match) => match.item).length;
  const rescues = ingredients.filter((match) => match.item && match.urgency !== 'fresh');
  const savesCents = rescues.reduce(
    (sum, match) => sum + (match.item!.priceCents ?? findFood(match.item!.name)?.priceCents ?? 0),
    0
  );
  const savesGrams = rescues.reduce(
    (sum, match) => sum + (match.item!.weightGrams ?? findFood(match.item!.name)?.grams ?? 0),
    0
  );
  const readyPct = required.length === 0 ? 100 : Math.round((inKitchen / required.length) * 100);
  const urgencyScore = ingredients.reduce(
    (sum, match) => sum + (match.urgency ? URGENCY_WEIGHT[match.urgency] : 0),
    0
  );
  return {
    recipe,
    ingredients,
    inKitchen,
    required: required.length,
    readyPct,
    rescues,
    savesCents,
    savesGrams,
    // Rescuing urgent food matters most, but a recipe you can cook right now beats one needing a shop.
    score: urgencyScore * 10 + readyPct * 2,
  };
}

/** Recipes ranked so the ones rescuing the most urgent food come first. */
export function rankRecipes(recipes: Recipe[], items: PantryItem[], now = today(), stars: Record<string, number> = {}) {
  const pantry = indexPantry(items);
  return recipes
    .map((recipe) => {
      const match = matchRecipe(recipe, pantry, now);
      // Loved recipes get a gentle nudge up; disliked ones drift down.
      const rating = stars[recipe.id];
      return rating ? { ...match, score: match.score + (rating - 3) * 15 } : match;
    })
    .sort((a, b) => b.score - a.score || a.recipe.minutes - b.recipe.minutes);
}
