import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Share, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Logo } from '@/components/logo';
import { Icon, type IconName } from '@/components/ui/icon';
import { Switch } from '@/components/ui/switch';
import { Text } from '@/components/ui/text';
import { imageSource } from '@/data/images';
import { getRecipe } from '@/data/recipes';
import { zones } from '@/domain/categories';
import { formatMoney } from '@/domain/format';
import { CO2_PER_KG } from '@/domain/insights';
import { getLastCook, undoLastCook, useEvents, useItems, zeroWasteStreak } from '@/store/pantry';
import { rateRecipe, toggleSavedRecipe, useSettings } from '@/store/settings';
import { useShadow } from '@/theme/shadows';
import { tone } from '@/theme/tones';

const TAGS: [string, string][] = [
  ['⚡', 'Super Easy'],
  ['❤️', 'Loved It'],
  ['✨', 'Great Flavor'],
  ['🌱', 'Saved Scraps'],
];

export default function CookingCompleteScreen() {
  const { recipe: recipeId } = useLocalSearchParams<{ recipe: string }>();
  const insets = useSafeAreaInsets();
  const shadow = useShadow();
  const settings = useSettings();
  const items = useItems();
  const events = useEvents();
  const recipe = getRecipe(recipeId);
  const [result] = useState(getLastCook);
  const existing = recipe ? settings.recipeRatings[recipe.id] : undefined;
  const [stars, setStars] = useState(existing?.stars ?? 0);
  const [tags, setTags] = useState<string[]>(existing?.tags ?? []);

  if (!recipe) return <Redirect href="/" />;

  const favorite = settings.savedRecipes.includes(recipe.id);
  const grams = result?.grams ?? 0;
  const co2 = (grams / 1000) * CO2_PER_KG;
  const amount = settings.units === 'metric' ? `${grams} g` : `${Math.round(grams / 28.35)} oz`;
  const streak = zeroWasteStreak(events, items);
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  weekStart.setHours(0, 0, 0, 0);
  const mealsThisWeek = new Set(events.filter((event) => event.recipeId && event.at >= weekStart.toISOString()).map((event) => `${event.recipeId}-${event.at.slice(0, 13)}`)).size;
  const rescued = result?.rescuedItems ?? 0;

  const saveRating = (nextStars: number, nextTags: string[]) => {
    setStars(nextStars);
    setTags(nextTags);
    if (nextStars > 0) rateRecipe(recipe.id, { stars: nextStars, tags: nextTags });
  };

  const undo = () => {
    undoLastCook();
    router.replace(`/recipe/${recipe.id}`);
  };

  return (
    <View className="flex-1 bg-surface">
      <View className="px-margin flex-row items-center gap-2 w-full max-w-[480px] self-center" style={{ paddingTop: insets.top + 8, paddingBottom: 8 }}>
        <Pressable accessibilityLabel="Close" onPress={() => router.dismissTo('/')} className="w-11 h-11 rounded-full bg-surface-container-high dark:bg-surface-container items-center justify-center">
          <Icon name="close" className="text-[22px] text-on-surface" />
        </Pressable>
        <Logo size={32} />
        <Text className="font-headline-sm text-headline-sm text-on-surface">Meal Logged</Text>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="w-full max-w-[480px] self-center px-margin pb-6 gap-space-lg">
        <View className="items-center gap-1.5">
          <View className="flex-row items-center gap-1.5 px-3 py-1 rounded-full bg-primary-fixed dark:bg-[#1C382B]">
            <Icon name="celebration" className="text-[16px] text-primary" />
            <Text className="font-label-md text-label-md text-on-primary-fixed dark:text-primary">Bon Appétit! Meal Logged</Text>
          </View>
          <Text className="font-headline-xl-mobile text-headline-xl-mobile text-on-surface text-center">
            {rescued > 0 ? `You just rescued ${rescued} ${rescued === 1 ? 'item' : 'items'}!` : 'Delicious work!'}
          </Text>
          <Text className="font-body-md text-body-md text-on-surface-variant text-center">Home cooking that keeps good food out of the bin.</Text>
        </View>

        <View className="h-56 rounded-3xl overflow-hidden" style={shadow('card')}>
          <Image source={imageSource(recipe.heroImage ?? recipe.image)} style={{ width: '100%', height: '100%' }} contentFit="cover" />
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.65)']} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
          <View className="absolute top-3 right-3 flex-row items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container-lowest/90">
            <Icon name="timer" className="text-[14px] text-on-surface" />
            <Text className="font-label-sm text-label-sm text-on-surface">{recipe.minutes} mins</Text>
          </View>
          <View className="absolute left-4 bottom-4 right-4">
            <Text className="font-label-sm text-label-sm text-primary-fixed uppercase tracking-wider">Rescue Recipe</Text>
            <Text className="font-headline-lg text-headline-lg text-white">{recipe.title}</Text>
          </View>
        </View>

        {/* Impact */}
        <View className="rounded-3xl p-space-md gap-3 bg-surface-container-low dark:bg-surface-container dark:border dark:border-outline-variant/60">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <Icon name="eco" className="text-[20px] text-primary" />
              <Text className="font-headline-sm text-headline-sm text-on-surface">Your Impact</Text>
            </View>
            <View className={`px-2 py-0.5 rounded-full ${tone.freshBg}`}>
              <Text className={`font-label-sm text-label-sm ${tone.freshText}`}>Logged</Text>
            </View>
          </View>
          <View className="flex-row gap-2">
            <ImpactTile icon="savings" color="text-secondary" value={formatMoney(result?.rescuedCents ?? 0)} label="Saved" />
            <ImpactTile icon="forest" color="text-primary" value={`-${co2.toFixed(1)} kg`} label="CO₂e" />
            <ImpactTile icon="hourglass_empty" color="text-tertiary" value={amount} label="Rescued" />
          </View>
          {(streak > 0 || mealsThisWeek > 0) && (
            <View className="flex-row items-center gap-3 p-3 rounded-2xl bg-secondary-fixed/60 dark:bg-[#3B2312]">
              <View className="w-10 h-10 rounded-full bg-secondary-container items-center justify-center">
                <Icon name="local_fire_department" className="text-[20px] text-on-secondary-container" />
              </View>
              <View className="flex-1">
                <Text className="font-label-md text-label-md text-on-surface font-semibold">
                  {streak > 0 ? `${streak}-Day Zero-Waste Streak!` : 'Rescue meal logged'}
                </Text>
                <Text className="font-body-sm text-body-sm text-on-surface-variant">
                  {mealsThisWeek > 0 ? `${mealsThisWeek === 1 ? '1st' : `${mealsThisWeek}${mealsThisWeek === 2 ? 'nd' : mealsThisWeek === 3 ? 'rd' : 'th'}`} rescued meal logged this week.` : 'Keep it going!'}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Pantry updated */}
        {result && result.deducted.length > 0 && (
          <View className={`rounded-3xl p-space-md gap-3 ${tone.card}`} style={shadow('card')}>
            <View>
              <View className="flex-row items-center gap-2">
                <Icon name="check_circle" className="text-[20px] text-primary" />
                <Text className="font-headline-sm text-headline-sm text-on-surface">Pantry Inventory Updated</Text>
              </View>
              <Text className="font-body-sm text-body-sm text-on-surface-variant">Ingredients automatically deducted from your kitchen:</Text>
            </View>
            {result.deducted.map(({ before, after, percent }) => {
              const ingredient = recipe.ingredients.find((entry) => before.name.toLowerCase().includes(entry.name.toLowerCase().split(' ').at(-1)!.replace(/s$/, '')));
              const depleted = !after || after.status !== 'active';
              return (
                <View key={before.id} className={`flex-row items-center gap-3 p-3 rounded-2xl ${tone.insetLow}`}>
                  <View className={`w-10 h-10 rounded-xl items-center justify-center ${depleted ? tone.coralTile : tone.freshBg}`}>
                    <Icon name={depleted ? 'remove_shopping_cart' : 'nutrition'} className={`text-[20px] ${depleted ? 'text-tertiary' : 'text-primary'}`} />
                  </View>
                  <View className="flex-1">
                    <Text numberOfLines={1} className="font-label-md text-label-md text-on-surface font-semibold">{before.name}</Text>
                    <Text numberOfLines={1} className="font-body-sm text-body-sm text-on-surface-variant">
                      Deducted {ingredient?.amount ?? `${percent}%`} • {before.shelf ?? zones[before.zone].label}
                    </Text>
                  </View>
                  <View className={`px-2 py-0.5 rounded-full ${depleted ? tone.urgentBg : after.remainingPct <= 30 ? tone.soonBg : 'bg-surface-container-high dark:bg-surface-container-highest'}`}>
                    <Text className={`font-label-sm text-label-sm ${depleted ? tone.urgentText : after.remainingPct <= 30 ? tone.soonText : 'text-on-surface-variant'}`}>
                      {depleted ? 'Depleted' : after.remainingPct >= 90 ? 'In Stock' : `${after.remainingPct}% left`}
                    </Text>
                  </View>
                </View>
              );
            })}
            <Pressable onPress={undo} className="flex-row items-center justify-center gap-1.5 py-1">
              <Icon name="undo" className="text-[16px] text-primary" />
              <Text className="font-label-md text-label-md text-primary">Undo deduction</Text>
            </Pressable>
          </View>
        )}

        {/* Rating */}
        <View className={`rounded-3xl p-space-md items-center gap-3 ${tone.card}`} style={shadow('card')}>
          <Text className="font-headline-md text-headline-md text-on-surface">How was your creation?</Text>
          <Text className="font-body-sm text-body-sm text-on-surface-variant -mt-2">Ratings tune which recipes the radar suggests first</Text>
          <View className="flex-row gap-3">
            {[1, 2, 3, 4, 5].map((value) => (
              <Pressable key={value} accessibilityLabel={`${value} stars`} onPress={() => saveRating(value, tags)}>
                <Icon name="star" filled={value <= stars} className={`text-[36px] ${value <= stars ? 'text-secondary-container dark:text-secondary' : 'text-outline-variant'}`} />
              </Pressable>
            ))}
          </View>
          <View className="flex-row flex-wrap justify-center gap-2">
            {TAGS.map(([emoji, label]) => {
              const active = tags.includes(label);
              return (
                <Pressable
                  key={label}
                  onPress={() => saveRating(Math.max(stars, 4), active ? tags.filter((tag) => tag !== label) : [...tags, label])}
                  className={`flex-row items-center gap-1 px-3 py-1.5 rounded-full ${active ? 'bg-primary-fixed dark:bg-[#1C382B]' : 'bg-surface-container-low dark:bg-surface-container-high'}`}>
                  <Text className="text-[12px]">{emoji}</Text>
                  <Text className={`font-label-sm text-label-sm ${active ? 'text-primary' : 'text-on-surface-variant'}`}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
          <View className="flex-row items-center justify-between self-stretch pt-2">
            <View className="flex-row items-center gap-2">
              <Icon name="favorite" filled={favorite} className="text-[20px] text-tertiary" />
              <Text className="font-label-md text-label-md text-on-surface">Save to My Favorites</Text>
            </View>
            <Switch label="Save to favorites" value={favorite} onValueChange={() => toggleSavedRecipe(recipe.id)} />
          </View>
        </View>

        <View className="gap-2">
          <Pressable onPress={() => router.dismissTo('/inventory')} className="h-14 rounded-full bg-primary flex-row items-center justify-center gap-2 active:scale-[0.98]" style={shadow('primaryButton')}>
            <Icon name="kitchen" className="text-[20px] text-on-primary" />
            <Text className="font-label-lg text-label-lg text-on-primary">View Updated Pantry</Text>
          </Pressable>
          <Pressable
            onPress={() =>
              Share.share({
                message: `I just cooked ${recipe.title} and rescued ${rescued} ${rescued === 1 ? 'ingredient' : 'ingredients'} from the bin 🌱 #ExpiryRadar`,
              }).catch(() => {})
            }
            className="h-14 rounded-full bg-surface-container-low dark:bg-surface-container flex-row items-center justify-center gap-2">
            <Icon name="share" className="text-[20px] text-on-surface" />
            <Text className="font-label-lg text-label-lg text-on-surface">Share Rescue Badge</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function ImpactTile({ icon, color, value, label }: { icon: IconName; color: string; value: string; label: string }) {
  return (
    <View className="flex-1 rounded-2xl p-3 items-center gap-1 bg-surface-container-lowest dark:bg-surface-container-high">
      <Icon name={icon} className={`text-[22px] ${color}`} />
      <Text className="font-headline-sm text-headline-sm text-on-surface">{value}</Text>
      <Text className="font-label-sm text-label-sm text-on-surface-variant">{label}</Text>
    </View>
  );
}
