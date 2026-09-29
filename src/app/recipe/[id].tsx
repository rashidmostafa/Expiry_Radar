import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, Share, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BookmarkButton } from '@/components/bookmark-button';
import { BottomNav } from '@/components/bottom-nav';
import { Checkbox } from '@/components/ui/checkbox';
import { Icon } from '@/components/ui/icon';
import { Switch } from '@/components/ui/switch';
import { Text } from '@/components/ui/text';
import { imageSource } from '@/data/images';
import { getRecipe, recipes, type Recipe } from '@/data/recipes';
import { daysBetween, today } from '@/domain/dates';
import { expiresPhrase } from '@/domain/expiry';
import { formatMoney, indexPantry, matchRecipe, rankRecipes, type IngredientMatch } from '@/domain/recipe-match';
import { zones } from '@/domain/categories';
import { cookDeductions, useActiveItems } from '@/store/pantry';
import { useShadow } from '@/theme/shadows';
import { useTheme } from '@/theme/theme-provider';
import { tone } from '@/theme/tones';

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const recipe = getRecipe(id);
  if (!recipe) {
    return (
      <View className="flex-1 bg-surface items-center justify-center gap-3">
        <Text className="font-headline-md text-headline-md">Recipe not found</Text>
        <Pressable onPress={() => router.back()}>
          <Text className="text-primary font-label-lg text-label-lg">Go back</Text>
        </Pressable>
      </View>
    );
  }
  return <RecipeDetail recipe={recipe} />;
}

function RecipeDetail({ recipe }: { recipe: Recipe }) {
  const shadow = useShadow();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const items = useActiveItems();
  const match = useMemo(() => matchRecipe(recipe, indexPantry(items)), [recipe, items]);
  const isTopPick = useMemo(() => rankRecipes(recipes, items)[0]?.recipe.id === recipe.id, [items, recipe.id]);

  const [servings, setServings] = useState(recipe.servings);
  const [autoDeduct, setAutoDeduct] = useState(true);
  const [done, setDone] = useState<Set<number>>(new Set());
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [timerEndsAt, setTimerEndsAt] = useState<number | undefined>();
  const [clock, setClock] = useState(0);

  useEffect(() => {
    if (!timerEndsAt) return;
    const interval = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [timerEndsAt]);

  const scale = servings / recipe.servings;
  const lead = match.rescues[0] ?? match.ingredients.find((entry) => entry.item);
  const leadDeduct = lead ? Math.min(100, Math.round(lead.ingredient.deduct * scale * 100)) : 0;
  const co2 = (match.savesGrams / 1000) * 2.5;
  const deductible = match.ingredients.filter((entry) => entry.item && !skipped.has(entry.ingredient.key) && entry.ingredient.deduct > 0);

  const cook = () => {
    const grams = autoDeduct
      ? cookDeductions(
          deductible.map((entry) => ({ id: entry.item!.id, percent: Math.max(1, Math.round(entry.ingredient.deduct * scale * 100)) }))
        )
      : 0;
    router.dismissTo({
      pathname: '/inventory',
      params: { cooked: recipe.id, count: String(autoDeduct ? deductible.length : 0), grams: String(grams), at: String(Date.now()) },
    });
  };

  const share = () => {
    const text = `${recipe.title} — ${recipe.minutes} mins, ${recipe.servings} servings.\n\n${recipe.ingredients
      .map((entry) => `• ${entry.amount} ${entry.name}`)
      .join('\n')}\n\nShared from Expiry Radar`;
    if (Platform.OS === 'web' && !('share' in navigator)) return;
    Share.share({ message: text, title: recipe.title }).catch(() => {});
  };

  const remaining = timerEndsAt ? Math.max(0, Math.round((timerEndsAt - clock) / 1000)) : 0;

  return (
    <View className="flex-1 bg-surface">
      {/* Header */}
      <View className="bg-surface/85 dark:bg-surface/90 dark:border-b dark:border-outline-variant/60" style={[{ paddingTop: insets.top }, shadow('header')]}>
        <View className="h-16 px-space-md flex-row items-center justify-between">
          <View className="flex-row items-center gap-space-sm flex-1">
            <Pressable accessibilityLabel="Go back" onPress={() => router.back()} className="w-11 h-11 -ml-2 rounded-full items-center justify-center">
              <Icon name="arrow_back" className="text-[24px] text-on-surface" />
            </Pressable>
            <View>
              <Text className="font-headline-sm text-headline-sm text-on-surface tracking-tight">Recipe Detail</Text>
              <Text className="font-label-sm text-label-sm text-primary leading-none">Expiry Radar Kitchen</Text>
            </View>
          </View>
          <View className="flex-row items-center">
            <Pressable accessibilityLabel="Share recipe" onPress={share} className="w-11 h-11 rounded-full items-center justify-center">
              <Icon name="share" className="text-[22px] text-on-surface-variant" />
            </Pressable>
            <BookmarkButton recipeId={recipe.id} className="w-11 h-11 rounded-full items-center justify-center" size="text-[22px]" />
          </View>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="w-full max-w-[480px] self-center px-margin pt-4 pb-6 gap-space-lg">
        {/* Recipe Hero Section */}
        <View className="relative w-full rounded-2xl overflow-hidden bg-surface-container-low dark:border dark:border-outline-variant/60" style={shadow('card')}>
          <View className="relative h-64 w-full">
            <Image source={imageSource(recipe.heroImage ?? recipe.image)} style={{ width: '100%', height: '100%' }} contentFit="cover" />
            <LinearGradient
              colors={['transparent', 'rgba(27,28,28,0.2)', 'rgba(27,28,28,0.8)']}
              style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
            />
            <View className="absolute top-space-md left-space-md right-space-md flex-row items-center justify-between gap-space-xs">
              {isTopPick && match.rescues.length > 0 ? (
                <View className="flex-row items-center gap-1 bg-surface/95 px-2.5 py-1 rounded-full" style={shadow('sm')}>
                  <Icon name="eco" filled className="text-[15px] text-primary" />
                  <Text className="font-label-sm text-label-sm text-primary">Top Rescue Pick</Text>
                </View>
              ) : (
                <View />
              )}
              {match.rescues[0] && (
                <View className="flex-row items-center gap-1 bg-secondary-container px-2.5 py-1 rounded-full flex-shrink" style={shadow('sm')}>
                  <Icon name="schedule" className="text-[15px] text-on-secondary-container" />
                  <Text numberOfLines={1} className="font-label-sm text-label-sm text-on-secondary-container flex-shrink">
                    {match.rescues[0].ingredient.name} {expiresPhrase(match.rescues[0].days!)}
                  </Text>
                </View>
              )}
            </View>
            <View className="absolute bottom-space-md left-space-md right-space-md flex-col">
              <Text className="font-label-sm text-label-sm text-primary-fixed dark:text-primary uppercase tracking-wider mb-0.5">
                {recipe.minutes <= 20 ? 'Quick Pantry Solution' : `${recipe.meal} Pantry Solution`}
              </Text>
              <Text className="font-headline-lg text-headline-lg font-bold leading-tight text-white">{recipe.title}</Text>
              <View className="flex-row items-center gap-1.5 mt-1">
                <Icon name="savings" className="text-[16px] text-primary-fixed dark:text-primary" />
                <Text className="font-body-sm text-body-sm text-[#e4e2e1]">
                  {match.rescues.length > 0
                    ? `Rescues ${match.rescues.length} ${match.rescues.length === 1 ? 'item' : 'items'} & saves approx. ${formatMoney(match.savesCents)}`
                    : recipe.description}
                </Text>
              </View>
            </View>
          </View>
          {/* Quick Metadata Strip */}
          <View className="bg-surface-container-lowest dark:bg-surface-container px-space-md py-space-sm flex-row items-center justify-between">
            <Meta icon="timer" iconColor="text-primary" label="Time" value={`${recipe.minutes} mins`} />
            <Meta icon="local_fire_department" iconColor="text-secondary" label="Calories" value={`${recipe.kcal} kcal`} />
            <Meta icon="psychology" iconColor="text-primary" label="Difficulty" value={recipe.difficulty} />
          </View>
        </View>

        {/* Servings Stepper & Waste Impact */}
        <View className="flex-row gap-space-sm">
          <View className={`flex-1 p-space-md rounded-2xl flex-col justify-between ${tone.card}`} style={shadow('sm')}>
            <Text className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Portions</Text>
            <View className="flex-row items-center justify-between mt-2">
              <Text className="font-headline-md text-headline-md font-bold text-on-surface">
                {servings} <Text className="font-body-sm text-body-sm font-normal text-on-surface-variant">servings</Text>
              </Text>
              <View className="flex-row items-center gap-1 bg-surface-container dark:bg-surface-container-high p-0.5 rounded-full">
                <RoundStep icon="remove" label="Decrease portions" onPress={() => setServings(Math.max(1, servings - 1))} />
                <RoundStep icon="add" label="Increase portions" onPress={() => setServings(Math.min(12, servings + 1))} />
              </View>
            </View>
          </View>
          <View className={`flex-1 p-space-md rounded-2xl flex-col justify-between ${tone.card}`} style={shadow('sm')}>
            <Text className="font-label-sm text-label-sm text-primary uppercase tracking-wider">Waste Impact</Text>
            <View className="flex-row items-center gap-2 mt-2">
              <View className={`w-8 h-8 rounded-full items-center justify-center ${tone.freshBg}`}>
                <Icon name="cloud_done" className={`text-[18px] ${tone.freshText}`} />
              </View>
              <View>
                <Text className="font-headline-md text-headline-md font-bold text-on-surface">-{co2.toFixed(1)} kg</Text>
                <Text className="font-label-sm text-label-sm text-on-surface-variant leading-none">CO₂ offset</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Pantry Match Readiness Banner */}
        <View className="bg-primary-container p-space-md rounded-2xl flex-col gap-2" style={shadow('sm')}>
          <View className="flex-row items-center justify-between gap-2">
            <View className="flex-row items-center gap-2 flex-1">
              <Icon name="task_alt" className="text-[20px] text-primary-fixed dark:text-on-primary-container" />
              <Text className="font-label-lg text-label-lg font-semibold text-on-primary-container">Pantry Match: {match.readyPct}% Ready</Text>
            </View>
            <View className="bg-primary px-2 py-0.5 rounded-full">
              <Text className="font-label-sm text-label-sm text-on-primary">
                {match.inKitchen} of {match.required} in Kitchen
              </Text>
            </View>
          </View>
          <View className="w-full bg-primary/40 rounded-full h-2 overflow-hidden">
            <View className="bg-primary-fixed h-full rounded-full" style={{ width: `${match.readyPct}%` }} />
          </View>
          {lead?.item && (
            <View className="flex-row items-center gap-1.5 mt-0.5">
              <Icon name="sync" className="text-[16px] text-primary-fixed dark:text-on-primary-container" />
              <Text className="font-body-sm text-body-sm text-on-primary-container/90 flex-1">
                {autoDeduct ? 'Cooking this will auto-deduct ' : 'Auto-deduct is off — nothing will change in '}
                {autoDeduct && (
                  <Text className="font-body-sm text-body-sm font-bold text-on-primary-container">
                    {leadDeduct}% ({lead.ingredient.amount})
                  </Text>
                )}
                {autoDeduct ? ` of your ${lead.item.name.replace(/\s*\(.*\)$/, '')}.` : 'your pantry.'}
              </Text>
            </View>
          )}
        </View>

        {/* Interactive Ingredients Checklist */}
        <View className="flex-col gap-space-sm">
          <View className="flex-row items-center justify-between px-1">
            <View className="flex-row items-baseline gap-2">
              <Text className="font-headline-sm text-headline-sm text-on-surface font-bold">Ingredients</Text>
              <Text className="font-label-sm text-label-sm text-on-surface-variant">{recipe.ingredients.length} items</Text>
            </View>
            <View className="flex-row items-center gap-2">
              <Text className="font-label-sm text-label-sm text-on-surface-variant">Auto-deduct</Text>
              <Switch label="Auto-deduct" value={autoDeduct} onValueChange={setAutoDeduct} />
            </View>
          </View>
          <View className="gap-space-xs">
            {match.ingredients.map((entry) => (
              <IngredientRow
                key={entry.ingredient.key}
                entry={entry}
                checked={!!entry.item && !skipped.has(entry.ingredient.key)}
                onToggle={(checked) =>
                  setSkipped((current) => {
                    const next = new Set(current);
                    if (checked) next.delete(entry.ingredient.key);
                    else next.add(entry.ingredient.key);
                    return next;
                  })
                }
              />
            ))}
          </View>
        </View>

        {/* Kitchen Gear Required */}
        <View className="flex-col gap-space-xs">
          <Text className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider px-1">Kitchen Tools Needed</Text>
          <View className="flex-row items-center gap-space-xs flex-wrap">
            {recipe.tools.map((tool) => (
              <View key={tool.name} className="bg-surface-container dark:bg-surface-container-high px-3 py-1.5 rounded-full flex-row items-center gap-1.5">
                <Icon name={tool.icon} className="text-[16px] text-primary" />
                <Text className="font-label-md text-label-md text-on-surface">{tool.name}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Step-by-Step Instructions */}
        <View className="flex-col gap-space-sm">
          <View className="px-1">
            <Text className="font-headline-sm text-headline-sm text-on-surface font-bold">Preparation Steps</Text>
            <Text className="font-label-sm text-label-sm text-on-surface-variant">Follow along or check off as you cook</Text>
          </View>
          {recipe.steps.map((step, index) => {
            const isDone = done.has(index);
            const rescued = step.rescues ? match.ingredients.find((entry) => entry.ingredient.key === step.rescues && entry.item) : undefined;
            return (
              <View key={step.title} className={`p-space-md rounded-2xl flex-col gap-2 ${tone.card} ${isDone ? 'opacity-60' : ''}`} style={shadow('sm')}>
                <View className="flex-row items-center justify-between gap-2">
                  <View className="flex-row items-center gap-2 flex-1">
                    <View className="w-6 h-6 rounded-full bg-primary items-center justify-center">
                      <Text className="font-label-sm text-label-sm font-bold text-on-primary">{index + 1}</Text>
                    </View>
                    <Text className="font-headline-sm text-headline-sm font-semibold text-on-surface flex-1">{step.title}</Text>
                  </View>
                  <View className="bg-surface-container dark:bg-surface-container-high px-2 py-0.5 rounded-full flex-row items-center gap-1">
                    <Icon name="schedule" className="text-[14px] text-on-surface-variant" />
                    <Text className="font-label-sm text-label-sm text-on-surface-variant">{step.minutes} mins</Text>
                  </View>
                </View>
                <Text className="font-body-md text-body-md text-on-surface-variant leading-relaxed">{step.text}</Text>
                <View className={`flex-row items-center pt-1 ${rescued ? 'justify-between' : 'justify-end'}`}>
                  {rescued && (
                    <View className="flex-row items-center gap-1">
                      <Icon name="check_circle" className="text-[16px] text-primary" />
                      <Text className="font-label-sm text-label-sm text-primary font-semibold">{rescued.ingredient.name} rescued</Text>
                    </View>
                  )}
                  <Pressable
                    onPress={() => setDone((current) => {
                      const next = new Set(current);
                      if (next.has(index)) next.delete(index);
                      else next.add(index);
                      return next;
                    })}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: isDone }}
                    className="flex-row items-center gap-1">
                    <Checkbox size={16} label={`Step ${index + 1} done`} checked={isDone} />
                    <Text className="font-label-sm text-label-sm text-on-surface-variant">Done</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>

        {/* Zero-Waste Chef's Rescue Tip */}
        <View className="bg-secondary-fixed/50 dark:bg-[#3B2312] dark:border dark:border-[#5D361B] p-space-md rounded-2xl flex-row items-start gap-space-sm">
          <View className="w-8 h-8 rounded-full bg-secondary-container items-center justify-center shrink-0 mt-0.5">
            <Icon name="lightbulb" className="text-[18px] text-on-secondary-container" />
          </View>
          <View className="flex-col flex-1">
            <Text className="font-label-sm text-label-sm font-bold text-on-secondary-fixed dark:text-secondary uppercase tracking-wide">Chef’s Rescue Secret</Text>
            <Text className="font-body-sm text-body-sm text-on-secondary-fixed-variant dark:text-on-surface-variant mt-0.5">{recipe.tip}</Text>
          </View>
        </View>

        {/* Floating action bar */}
        <View className="pt-2">
          <View className="bg-surface-container-lowest/95 dark:bg-surface-container-high p-space-sm rounded-2xl flex-row items-center gap-space-sm" style={{ boxShadow: `0px 20px 25px -5px ${colors['on-surface']}1a, 0px 8px 10px -6px ${colors['on-surface']}1a` }}>
            <Pressable
              onPress={cook}
              className="flex-1 bg-primary h-12 rounded-full flex-row items-center justify-center gap-2 active:scale-95"
              style={shadow('primaryButton')}>
              <Icon name="outdoor_grill" className="text-[20px] text-on-primary" />
              <Text className="font-label-lg text-label-lg text-on-primary">
                {autoDeduct && deductible.length > 0 ? 'Mark Cooked & Deduct Pantry' : 'Mark as Cooked'}
              </Text>
            </Pressable>
            <Pressable
              accessibilityLabel={timerEndsAt ? 'Stop cooking timer' : `Start ${recipe.minutes}-minute cooking timer`}
              onPress={() => {
                const started = Date.now();
                setClock(started);
                setTimerEndsAt(timerEndsAt ? undefined : started + recipe.minutes * 60_000);
              }}
              className={`h-12 rounded-full items-center justify-center active:scale-90 ${timerEndsAt ? 'px-3 bg-primary-fixed dark:bg-[#1C382B]' : 'w-12 bg-surface-container dark:bg-surface-container-highest'}`}>
              {timerEndsAt ? (
                <Text className="font-label-lg text-label-lg text-primary font-bold">
                  {remaining === 0 ? 'Done!' : `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`}
                </Text>
              ) : (
                <Icon name="timer" className="text-[22px] text-on-surface-variant" />
              )}
            </Pressable>
          </View>
        </View>
      </ScrollView>
      <BottomNav active="recipes" />
    </View>
  );
}

function Meta({ icon, iconColor, label, value }: { icon: 'timer' | 'local_fire_department' | 'psychology'; iconColor: string; label: string; value: string }) {
  return (
    <View className="flex-row items-center gap-space-sm">
      <View className="w-9 h-9 rounded-full bg-surface-container dark:bg-surface-container-high items-center justify-center">
        <Icon name={icon} className={`text-[20px] ${iconColor}`} />
      </View>
      <View className="flex-col">
        <Text className="font-label-sm text-label-sm text-on-surface-variant">{label}</Text>
        <Text className="font-label-md text-label-md font-semibold text-on-surface">{value}</Text>
      </View>
    </View>
  );
}

function RoundStep({ icon, label, onPress }: { icon: 'add' | 'remove'; label: string; onPress: () => void }) {
  const shadow = useShadow();
  return (
    <Pressable
      accessibilityLabel={label}
      onPress={onPress}
      className="w-7 h-7 rounded-full bg-surface-container-lowest dark:bg-surface-container-highest items-center justify-center active:scale-90"
      style={shadow('sm')}>
      <Icon name={icon} className="text-[16px] text-on-surface" />
    </Pressable>
  );
}

function IngredientRow({ entry, checked, onToggle }: { entry: IngredientMatch; checked: boolean; onToggle: (checked: boolean) => void }) {
  const shadow = useShadow();
  const { ingredient, item, urgency, days } = entry;

  let badge: { label: string; className: string; text: string } | undefined;
  if (item && urgency && urgency !== 'fresh') {
    badge = { label: expiresPhrase(days!).replace(/^expires/, 'Expiring').replace(/\b\w/g, (c) => c.toUpperCase()), className: 'bg-secondary-container', text: 'text-on-secondary-container' };
  } else if (item && item.quantity > 1) {
    badge = { label: `${Math.max(1, Math.round((item.quantity * item.remainingPct) / 100))} in stock`, className: 'bg-surface-container dark:bg-surface-container-high', text: 'text-on-surface-variant' };
  } else if (ingredient.staple) {
    badge = { label: 'Staple', className: 'bg-tertiary-fixed dark:bg-[#3A1813]', text: 'text-on-tertiary-fixed dark:text-tertiary' };
  } else if (ingredient.optional) {
    badge = { label: 'Optional', className: 'bg-surface-container dark:bg-surface-container-high', text: 'text-on-surface-variant' };
  }

  const where = item
    ? [item.detail, [zones[item.zone].label, item.shelf].filter(Boolean).join(' '), item.openedOn ? `Opened ${daysBetween(item.openedOn, today())}d ago` : undefined]
        .filter(Boolean)
        .slice(0, 2)
        .join(' • ')
    : ingredient.optional
      ? 'Nice to have'
      : 'Not in your kitchen';

  return (
    <View className={`p-space-md rounded-xl flex-row items-center justify-between ${tone.card}`} style={shadow('sm')}>
      <View className="flex-row items-center gap-space-sm min-w-0 flex-1">
        {item ? <Checkbox label={`Use ${ingredient.name}`} checked={checked} onChange={onToggle} /> : <Checkbox label={ingredient.name} checked={false} />}
        <View className="flex-col min-w-0 flex-1">
          <View className="flex-row items-center gap-1.5 flex-wrap">
            <Text numberOfLines={1} className="font-label-lg text-label-lg font-semibold text-on-surface flex-shrink">
              {ingredient.name}
            </Text>
            {badge && (
              <View className={`px-2 py-0.5 rounded-full ${badge.className}`}>
                <Text className={`font-label-sm text-label-sm ${badge.text}`}>{badge.label}</Text>
              </View>
            )}
          </View>
          <Text numberOfLines={1} className="font-body-sm text-body-sm text-on-surface-variant">
            {where}
          </Text>
        </View>
      </View>
      {item || ingredient.optional ? (
        <Text className="font-label-md text-label-md font-bold text-on-surface pl-2">{ingredient.amount}</Text>
      ) : (
        <View className="flex-row items-center gap-2 pl-2">
          <Text className="font-label-md text-label-md text-on-surface">{ingredient.amount}</Text>
          <Pressable
            onPress={() => router.push({ pathname: '/add-item', params: { name: ingredient.name } })}
            className="bg-surface-container dark:bg-surface-container-high px-2 py-1 rounded-full flex-row items-center gap-0.5">
            <Icon name="add_shopping_cart" className="text-[14px] text-on-surface" />
            <Text className="font-label-sm text-label-sm text-on-surface">Add</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
