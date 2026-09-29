import { useMemo } from 'react';

import { fitsDiets, recipes } from '@/data/recipes';
import { today } from '@/domain/dates';
import { rankRecipes } from '@/domain/recipe-match';

import { useActiveItems } from './pantry';
import { useSettings } from './settings';

/** Recipes that fit the household's diets. */
export function useRecipeCatalog() {
  const { diets } = useSettings();
  return useMemo(() => recipes.filter((recipe) => fitsDiets(recipe, diets)), [diets]);
}

/** Diet-filtered recipes ranked against the live pantry (rescue urgency, readiness, ratings). */
export function useRankedRecipes() {
  const catalog = useRecipeCatalog();
  const items = useActiveItems();
  const { recipeRatings } = useSettings();
  const now = today();
  return useMemo(() => {
    const stars = Object.fromEntries(Object.entries(recipeRatings).map(([id, rating]) => [id, rating.stars]));
    return rankRecipes(catalog, items, now, stars);
  }, [catalog, items, now, recipeRatings]);
}
