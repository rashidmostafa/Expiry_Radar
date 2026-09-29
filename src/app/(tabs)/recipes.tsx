import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { BookmarkButton } from '@/components/bookmark-button';
import { Icon } from '@/components/ui/icon';
import { Text, TextInput } from '@/components/ui/text';
import { DIETS } from '@/data/household';
import { imageSource } from '@/data/images';
import type { Recipe } from '@/data/recipes';
import { today } from '@/domain/dates';
import { daysLeft, expiresPhrase, needsAttention, urgencyFor } from '@/domain/expiry';
import { findFood } from '@/domain/foods';
import { formatMoney } from '@/domain/format';
import type { IngredientMatch, RecipeMatch } from '@/domain/recipe-match';
import type { Urgency } from '@/domain/types';
import { useActiveItems } from '@/store/pantry';
import { useRankedRecipes, useRecipeCatalog } from '@/store/recipe-book';
import { useSettings } from '@/store/settings';
import { useShadow } from '@/theme/shadows';
import { tone } from '@/theme/tones';

const MEAL_LABELS: Record<Recipe['meal'], string> = {
  Breakfast: 'Breakfast',
  Brunch: 'Brunch',
  Lunch: 'Lunch',
  Dinner: 'Dinner',
  Side: 'Sides',
  Snack: 'Snacks',
};

const DOT: Record<Urgency, string> = {
  expired: 'bg-error dark:bg-tertiary',
  urgent: 'bg-error dark:bg-tertiary',
  soon: 'bg-secondary-container dark:bg-secondary',
  fresh: 'bg-primary-container',
};
const DAYS_TEXT: Record<Urgency, string> = {
  expired: 'text-error dark:text-tertiary',
  urgent: 'text-error dark:text-tertiary',
  soon: 'text-secondary',
  fresh: 'text-primary',
};
const USES_CHIP: Record<Urgency, string> = {
  expired: 'bg-error-container/60 dark:bg-[#3A1813]',
  urgent: 'bg-error-container/60 dark:bg-[#3A1813]',
  soon: 'bg-secondary-fixed/60 dark:bg-[#3B2312]',
  fresh: 'bg-primary-fixed/50 dark:bg-[#1C382B]',
};
const USES_TEXT: Record<Urgency, string> = {
  expired: 'text-on-error-container dark:text-tertiary',
  urgent: 'text-on-error-container dark:text-tertiary',
  soon: 'text-on-secondary-fixed dark:text-secondary',
  fresh: 'text-on-primary-fixed dark:text-primary',
};

type Meal = 'all' | 'quick' | Recipe['meal'];

export default function RecipesScreen() {
  const shadow = useShadow();
  const items = useActiveItems();
  const params = useLocalSearchParams<{ ingredient?: string }>();
  const [ingredient, setIngredient] = useState<string>(params.ingredient ?? 'all');
  // A nudge can deep-link here filtered to one item; apply it each time the param changes.
  const [seenParam, setSeenParam] = useState(params.ingredient);
  if (params.ingredient !== seenParam) {
    setSeenParam(params.ingredient);
    if (params.ingredient) setIngredient(params.ingredient);
  }
  const [meal, setMeal] = useState<Meal>('all');
  const [search, setSearch] = useState('');
  const [searchTerms, setSearchTerms] = useState<string[]>([]);

  const now = today();
  const ranked = useRankedRecipes();
  const catalog = useRecipeCatalog();
  const { diets } = useSettings();
  const expiring = items.filter((item) => needsAttention(item, now));
  const urgentCount = expiring.filter((item) => urgencyFor(daysLeft(item, now)) !== 'soon').length;

  const rescueRecipes = ranked.filter((match) => match.rescues.length > 0);
  const rescuedIds = new Set(rescueRecipes.flatMap((match) => match.rescues.map((rescue) => rescue.item!.id)));
  const rescued = items.filter((item) => rescuedIds.has(item.id));
  const rescueCents = rescued.reduce((sum, item) => sum + (item.priceCents ?? findFood(item.name)?.priceCents ?? 0), 0);
  const rescueKg = rescued.reduce((sum, item) => sum + (item.weightGrams ?? findFood(item.name)?.grams ?? 0), 0) / 1000;

  const meals = [...new Set(catalog.map((recipe) => recipe.meal))];

  const visible = ranked.filter((match) => {
    const { recipe } = match;
    if (meal === 'quick' && recipe.minutes >= 20) return false;
    if (meal !== 'all' && meal !== 'quick' && recipe.meal !== meal) return false;
    if (ingredient !== 'all' && !match.ingredients.some((entry) => entry.item?.id === ingredient)) return false;
    if (searchTerms.length > 0) {
      const haystack = `${recipe.title} ${recipe.ingredients.map((entry) => entry.name).join(' ')}`.toLowerCase();
      if (!searchTerms.some((term) => haystack.includes(term))) return false;
    }
    return true;
  });
  const [featured, ...rest] = visible;

  const runSearch = () =>
    setSearchTerms(
      search
        .toLowerCase()
        .split(/[,;]+|\band\b/)
        .map((term) => term.trim().replace(/(es|s)$/, ''))
        .filter((term) => term.length > 1)
    );

  return (
    <View className="flex-1 bg-surface">
      <AppHeader page="Recipes" />
      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="w-full max-w-[480px] self-center px-margin pt-1 pb-8 gap-space-lg">
        {/* Dynamic Kitchen Status Header */}
        <View className="flex-col gap-space-sm pt-1">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-1.5 px-3 py-1 rounded-full bg-primary-fixed/40 dark:bg-[#1C382B] dark:border dark:border-[#2B5440]">
              <Icon name="eco" filled className="text-[15px] text-primary" />
              <Text className="font-label-sm text-label-sm font-semibold tracking-wide uppercase text-on-primary-fixed dark:text-primary">
                Zero-Waste Kitchen
              </Text>
            </View>
            <Text className="font-label-sm text-label-sm text-on-surface-variant font-medium">Live from your pantry</Text>
          </View>
          <View>
            <Text className="font-headline-xl-mobile text-headline-xl-mobile text-on-surface tracking-tight">Cook Before It Expires</Text>
            <Text className="font-body-md text-body-md text-on-surface-variant mt-0.5">
              {expiring.length > 0
                ? `Smart recipes crafted from ${expiring.length} ${expiring.length === 1 ? 'ingredient' : 'ingredients'} ready for rescue today.`
                : 'Nothing is at risk right now — here is what your pantry can make.'}
            </Text>
          </View>
          {diets.length > 0 && (
            <Pressable onPress={() => router.push('/settings/pantry')} className="self-start flex-row items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high dark:bg-surface-container">
              <Icon name="filter_alt" className="text-[14px] text-primary" />
              <Text className="font-label-sm text-label-sm text-on-surface-variant">
                Showing {diets.map((diet) => DIETS.find((option) => option.value === diet)?.label ?? diet).join(', ').toLowerCase()} recipes
              </Text>
            </Pressable>
          )}
          {rescueRecipes.length > 0 && (
            <View className="flex-row items-center gap-3 p-space-md rounded-2xl bg-secondary-container/25 dark:bg-[#3B2312] dark:border dark:border-[#5D361B]" style={shadow('sm')}>
              <View className="w-10 h-10 rounded-xl bg-secondary items-center justify-center shrink-0" style={shadow('sm')}>
                <Icon name="bolt" filled className="text-[20px] text-on-secondary" />
              </View>
              <View className="flex-col flex-1 min-w-0">
                <View className="flex-row items-center gap-1.5">
                  <Text className="font-label-lg text-label-lg text-secondary font-bold">
                    {rescueRecipes.length} urgent rescue {rescueRecipes.length === 1 ? 'recipe' : 'recipes'}
                  </Text>
                  <View className="w-1.5 h-1.5 rounded-full bg-tertiary" />
                </View>
                <Text numberOfLines={1} className="font-body-sm text-body-sm text-on-surface-variant">
                  Saves roughly {formatMoney(rescueCents)} and avoids {rescueKg.toFixed(1)}kg food waste
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Expiring Ingredients Selector Bar */}
        {expiring.length > 0 && (
          <View className="flex-col gap-2.5">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-1.5">
                <Text className="font-label-lg text-label-lg text-on-surface font-semibold">Expiring in your pantry</Text>
                {urgentCount > 0 && (
                  <View className="px-1.5 py-0.5 rounded-full bg-error-container/60 dark:bg-[#3A1813]">
                    <Text className="font-label-sm text-label-sm text-tertiary font-bold">{urgentCount} urgent</Text>
                  </View>
                )}
              </View>
              <Text className="font-label-sm text-label-sm text-on-surface-variant">Tap to filter</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-margin" contentContainerClassName="px-margin pb-1 gap-2">
              <Pressable
                onPress={() => setIngredient('all')}
                className={`flex-row items-center gap-2 px-3.5 py-2 rounded-full active:scale-95 ${ingredient === 'all' ? 'bg-primary' : tone.card}`}
                style={shadow('sm')}>
                <Text className={`font-label-md text-label-md font-semibold ${ingredient === 'all' ? 'text-on-primary' : 'text-on-surface'}`}>All Items</Text>
                <View className={`w-5 h-5 rounded-full items-center justify-center ${ingredient === 'all' ? 'bg-on-primary/20' : 'bg-surface-container-highest'}`}>
                  <Text className={`font-label-sm text-[10px] font-bold ${ingredient === 'all' ? 'text-on-primary' : 'text-on-surface'}`}>{expiring.length}</Text>
                </View>
              </Pressable>
              {expiring.map((item) => {
                const days = daysLeft(item, now);
                const urgency = urgencyFor(days);
                const active = ingredient === item.id;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => setIngredient(active ? 'all' : item.id)}
                    className={`flex-row items-center gap-2 px-3.5 py-2 rounded-full active:scale-95 ${active ? 'bg-primary' : tone.card}`}
                    style={shadow('sm')}>
                    <View className={`w-2.5 h-2.5 rounded-full shrink-0 ${active ? 'bg-on-primary' : DOT[urgency]}`} />
                    <Text className={`font-label-md text-label-md font-semibold ${active ? 'text-on-primary' : 'text-on-surface'}`}>
                      {item.name.replace(/\s*\(.*\)$/, '')}
                    </Text>
                    <Text className={`font-label-sm text-label-sm font-medium ${active ? 'text-on-primary' : DAYS_TEXT[urgency]}`}>
                      {days < 0 ? 'expired' : `${days}d left`}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Meal Category Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-margin" contentContainerClassName="px-margin pb-0.5 gap-2">
          <MealChip label="All Recipes" active={meal === 'all'} onPress={() => setMeal('all')} />
          <MealChip label="Quick (<20m)" active={meal === 'quick'} onPress={() => setMeal('quick')} />
          {meals.map((entry) => (
            <MealChip key={entry} label={MEAL_LABELS[entry]} active={meal === entry} onPress={() => setMeal(entry)} />
          ))}
        </ScrollView>

        {featured ? (
          <FeaturedCard match={featured} />
        ) : (
          <View className="items-center py-10 gap-2">
            <Icon name="search_off" className="text-[32px] text-outline dark:text-on-surface-variant" />
            <Text className="font-body-md text-body-md text-on-surface-variant text-center">No recipes match these filters yet.</Text>
          </View>
        )}

        {/* Recipe Suggestions Feed */}
        {rest.length > 0 && (
          <View className="flex-col gap-space-md">
            <View className="flex-row items-center justify-between">
              <Text className="font-headline-sm text-headline-sm text-on-surface font-bold">More Pantry Matches</Text>
              <Text className="font-label-md text-label-md text-primary font-semibold">Sorted by Urgency</Text>
            </View>
            {rest.map((match) => (
              <RecipeCard key={match.recipe.id} match={match} />
            ))}
          </View>
        )}

        {/* Ingredient finder */}
        <View className="p-space-md rounded-3xl bg-surface-container-high/60 dark:bg-surface-container dark:border dark:border-outline-variant/60 flex-col gap-space-md" style={shadow('sm')}>
          <View className="flex-row items-start gap-3">
            <View className="w-10 h-10 rounded-2xl bg-primary items-center justify-center shrink-0" style={shadow('sm')}>
              <Icon name="psychology" className="text-[22px] text-on-primary" />
            </View>
            <View className="flex-col flex-1">
              <Text className="font-headline-sm text-headline-sm text-on-surface font-bold">Have random ingredients left over?</Text>
              <Text className="font-body-sm text-body-sm text-on-surface-variant">
                List what you have and we’ll find the best match in your recipe box.
              </Text>
            </View>
          </View>
          <View className="flex-col gap-2.5">
            <View className="relative flex-row items-center">
              <View className="absolute left-3 z-10">
                <Icon name="search" className="text-[18px] text-outline dark:text-on-surface-variant" />
              </View>
              <TextInput
                value={search}
                onChangeText={(text) => {
                  setSearch(text);
                  if (!text) setSearchTerms([]);
                }}
                onSubmitEditing={runSearch}
                returnKeyType="search"
                placeholder="e.g., avocado, lime, onion..."
                className="w-full h-12 pl-10 pr-4 rounded-xl bg-surface-container-lowest dark:bg-surface-container-low font-body-md text-body-md text-on-surface"
                style={shadow('sm')}
              />
            </View>
            <Pressable
              onPress={runSearch}
              className="w-full h-11 rounded-xl bg-surface-container-highest flex-row items-center justify-center gap-2 active:scale-[0.98]">
              <Icon name="magic_button" className="text-[18px] text-primary" />
              <Text className="font-label-lg text-label-lg text-on-surface font-semibold">
                {searchTerms.length > 0 ? `Showing ${visible.length} ${visible.length === 1 ? 'match' : 'matches'}` : 'Find a Recipe'}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function MealChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const shadow = useShadow();
  return (
    <Pressable
      onPress={onPress}
      className={`px-4 py-1.5 rounded-full ${active ? 'bg-primary' : 'bg-surface-container-low dark:bg-surface-container'}`}
      style={active ? shadow('sm') : undefined}>
      <Text className={`font-label-md text-label-md ${active ? 'text-on-primary font-semibold' : 'text-on-surface-variant font-medium'}`}>{label}</Text>
    </Pressable>
  );
}

function ingredientNote(match: IngredientMatch) {
  if (match.urgency && match.urgency !== 'fresh') return expiresPhrase(match.days!).replace('expires', 'Expiring');
  const item = match.item!;
  if (item.remainingPct < 100) return `${item.remainingPct}% left`;
  return item.zone === 'freezer' ? 'Freezer' : item.zone === 'pantry' ? 'Pantry' : 'Fridge';
}

function FeaturedCard({ match }: { match: RecipeMatch }) {
  const shadow = useShadow();
  const { recipe } = match;
  return (
    <View className={`flex-col rounded-3xl overflow-hidden ${tone.card}`} style={shadow('card')}>
      <View className="relative w-full h-52 bg-surface-container">
        <Image source={imageSource(recipe.image)} style={{ width: '100%', height: '100%' }} contentFit="cover" />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.6)']}
          style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
        />
        <View className="absolute top-3 left-3 right-3 flex-row items-center justify-between">
          <View className="flex-row items-center gap-1.5 px-3 py-1 rounded-full bg-primary/95" style={shadow('card')}>
            <Icon name="auto_awesome" className="text-[14px] text-on-primary" />
            <Text className="font-label-sm text-label-sm font-bold text-on-primary">
              {match.rescues.length > 0 ? 'Top Rescue Pick' : 'Top Pantry Match'}
            </Text>
          </View>
          <BookmarkButton
            recipeId={recipe.id}
            className="w-9 h-9 rounded-full bg-surface-container-lowest/90 items-center justify-center"
            size="text-[19px]"
            color="text-on-surface"
          />
        </View>
        <View className="absolute bottom-3 left-3 right-3 flex-row items-center justify-between">
          {match.rescues.length > 0 ? (
            <View className="px-2.5 py-0.5 rounded-full bg-tertiary-container/90">
              <Text className="font-label-sm text-label-sm font-semibold text-on-tertiary-container">
                Saves {formatMoney(match.savesCents)} & {match.rescues.length} {match.rescues.length === 1 ? 'item' : 'items'}
              </Text>
            </View>
          ) : (
            <View />
          )}
          <View className="flex-row items-center gap-1 bg-black/40 px-2.5 py-0.5 rounded-full">
            <Icon name="timer" className="text-[15px] text-primary-fixed dark:text-primary" />
            <Text className="font-label-sm text-label-sm text-white">{recipe.minutes} mins</Text>
          </View>
        </View>
      </View>
      <View className="p-space-md flex-col gap-space-md">
        <View>
          <View className="flex-row items-center justify-between gap-2">
            <Text className="font-headline-sm text-headline-sm text-on-surface font-bold flex-1">{recipe.title}</Text>
            <View className="px-2 py-0.5 rounded-md bg-primary-fixed/30 dark:bg-[#1C382B]">
              <Text className="font-label-sm text-label-sm font-semibold text-primary">{match.readyPct}% Ready</Text>
            </View>
          </View>
          <View className="flex-row flex-wrap items-center gap-3 mt-1">
            <View className="flex-row items-center gap-1">
              <Icon name="room_service" className="text-[15px] text-on-surface-variant" />
              <Text className="font-body-sm text-body-sm text-on-surface-variant">{recipe.servings} portions</Text>
            </View>
            <Text className="text-on-surface-variant">•</Text>
            <View className="flex-row items-center gap-1">
              <Icon name="skillet" className="text-[15px] text-on-surface-variant" />
              <Text className="font-body-sm text-body-sm text-on-surface-variant">{recipe.difficulty === 'Easy Prep' ? 'Easy prep' : recipe.difficulty}</Text>
            </View>
            <Text className="text-on-surface-variant">•</Text>
            <Text className={`font-body-sm text-body-sm font-medium ${match.readyPct === 100 ? 'text-primary' : 'text-secondary'}`}>
              {match.inKitchen} of {match.required} in pantry
            </Text>
          </View>
        </View>
        <View className={`flex-col gap-2 p-3 rounded-2xl ${tone.insetLow}`}>
          <Text className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">
            Matched ingredients in your kitchen
          </Text>
          <View className="flex-row flex-wrap gap-1.5">
            {match.ingredients.map((entry) =>
              entry.item ? (
                <View key={entry.ingredient.key} className="flex-row items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-container-lowest dark:bg-surface-container-high" style={shadow('sm')}>
                  <Icon
                    name="check_circle"
                    className={`text-[14px] ${entry.urgency === 'urgent' || entry.urgency === 'expired' ? 'text-error dark:text-tertiary' : 'text-primary'}`}
                  />
                  <Text className="font-label-sm text-label-sm font-medium text-on-surface">{entry.ingredient.name}</Text>
                  <Text
                    className={`font-label-sm text-label-sm ${entry.urgency === 'urgent' || entry.urgency === 'expired' ? 'text-error dark:text-tertiary font-semibold' : 'text-on-surface-variant'}`}>
                    ({ingredientNote(entry)})
                  </Text>
                </View>
              ) : entry.ingredient.optional ? null : (
                <View key={entry.ingredient.key} className="flex-row items-center gap-1 px-2.5 py-1 rounded-lg bg-secondary-container/20 dark:bg-[#3B2312]">
                  <Icon name="add_circle" className="text-[14px] text-secondary" />
                  <Text className="font-label-sm text-label-sm font-semibold text-secondary">Need: {entry.ingredient.name}</Text>
                </View>
              )
            )}
          </View>
        </View>
        <Pressable
          onPress={() => router.push(`/recipe/${recipe.id}`)}
          className="w-full h-12 rounded-full bg-primary flex-row items-center justify-center gap-2 active:scale-[0.98]"
          style={shadow('primaryButton')}>
          <Text className="font-label-lg text-label-lg font-bold text-on-primary">Start Cooking</Text>
          <Icon name="arrow_forward" className="text-[18px] text-on-primary" />
        </Pressable>
      </View>
    </View>
  );
}

function RecipeCard({ match }: { match: RecipeMatch }) {
  const shadow = useShadow();
  const { recipe } = match;
  const lead = match.rescues[0] ?? match.ingredients.find((entry) => entry.item);
  const others = match.ingredients.filter((entry) => entry.item && entry !== lead).slice(0, 1);
  const missing = match.ingredients.find((entry) => !entry.item && !entry.ingredient.optional);
  const metaColor = lead?.urgency === 'soon' ? 'text-secondary' : lead?.urgency === 'fresh' ? 'text-primary-container' : 'text-primary';
  return (
    <Pressable
      onPress={() => router.push(`/recipe/${recipe.id}`)}
      className={`flex-col gap-3.5 p-space-md rounded-2xl active:scale-[0.99] ${tone.card}`}
      style={shadow('sm')}>
      <View className="relative w-full h-32 rounded-xl overflow-hidden bg-surface-container">
        <Image source={imageSource(recipe.image)} style={{ width: '100%', height: '100%' }} contentFit="cover" />
        <View className={`absolute top-2 left-2 px-2 py-0.5 rounded-full ${match.readyPct === 100 ? 'bg-primary' : 'bg-surface-variant'}`} style={shadow('sm')}>
          <Text className={`font-label-sm text-[10px] font-bold ${match.readyPct === 100 ? 'text-on-primary' : 'text-on-surface-variant'}`}>
            {match.readyPct === 100 ? '100% Match' : `${match.inKitchen}/${match.required} Match`}
          </Text>
        </View>
      </View>
      <View className="flex-col gap-1">
        <View className="flex-row items-center justify-between">
          <Text className={`font-label-sm text-label-sm font-semibold ${metaColor}`}>
            {recipe.minutes} mins • {recipe.tags[0] === 'No Cook' ? 'No Cook' : recipe.meal}
          </Text>
          <BookmarkButton recipeId={recipe.id} />
        </View>
        <Text numberOfLines={1} className="font-headline-sm text-headline-sm text-on-surface font-bold leading-snug">
          {recipe.title}
        </Text>
        <Text className="font-body-sm text-body-sm text-on-surface-variant">{recipe.description}</Text>
      </View>
      <View className="flex-row flex-wrap items-center justify-between gap-2">
        <View className="flex-row flex-wrap items-center gap-1.5 flex-1">
          {lead?.item && (
            <View className={`px-2 py-0.5 rounded ${USES_CHIP[lead.urgency!]}`}>
              <Text className={`font-label-sm text-label-sm font-semibold ${USES_TEXT[lead.urgency!]}`}>
                Uses {lead.ingredient.name.replace(/^(Baby|Ripe|Fresh|Large) /, '')} ({lead.days! < 0 ? 'expired' : `${lead.days}d left`})
              </Text>
            </View>
          )}
          {others.map((entry) => (
            <View key={entry.ingredient.key} className="px-2 py-0.5 rounded bg-surface-container dark:bg-surface-container-high">
              <Text className="font-label-sm text-label-sm text-on-surface-variant">+ {entry.ingredient.name.replace(/^(Baby|Ripe|Fresh|Large) /, '')}</Text>
            </View>
          ))}
          {missing && (
            <View className="px-2 py-0.5 rounded bg-secondary-container/20 dark:bg-[#3B2312]">
              <Text className="font-label-sm text-label-sm font-medium text-secondary">Need: {missing.ingredient.name}</Text>
            </View>
          )}
        </View>
        <Text className={`font-label-sm text-label-sm font-medium ${match.savesCents > 0 ? 'text-primary' : 'text-on-surface-variant'}`}>
          {match.savesCents > 0 ? `Save ${formatMoney(match.savesCents)}` : recipe.proteinGrams ? `${recipe.proteinGrams}g Protein` : `${recipe.kcal} kcal`}
        </Text>
      </View>
    </Pressable>
  );
}
