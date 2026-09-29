import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { FoodThumb } from '@/components/food-thumb';
import { ProgressRing } from '@/components/progress-ring';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { UrgencyPill, urgencyTone } from '@/components/urgency';
import { imageSource } from '@/data/images';
import { recipes, recipesUsing } from '@/data/recipes';
import { categories } from '@/domain/categories';
import { greeting, today } from '@/domain/dates';
import { daysLeft, expiresPhrase, needsAttention, relativeExpiry, shortCountdown, urgencyFor } from '@/domain/expiry';
import { findFood } from '@/domain/foods';
import { rankRecipes } from '@/domain/recipe-match';
import type { PantryItem } from '@/domain/types';
import { freezeItem, markUsed, summarize, useActiveItems, useEvents, zeroWasteStreak } from '@/store/pantry';
import { useSettings } from '@/store/settings';
import { useShadow } from '@/theme/shadows';
import { tone } from '@/theme/tones';

const FALLBACK_TIP = 'Keep a "use first" basket at eye level in the fridge — what you see is what gets eaten.';

function monthStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

export default function HomeScreen() {
  const shadow = useShadow();
  const { userName } = useSettings();
  const items = useActiveItems();
  const events = useEvents();

  const now = today();
  const attention = items.filter((item) => needsAttention(item, now));
  const upcoming = items.filter((item) => daysLeft(item, now) <= 7).slice(0, 8);
  const month = summarize(items, events, monthStart());
  const streak = zeroWasteStreak(events, items);
  const nudge = rankRecipes(recipes, items, now).find((match) => match.rescues.length > 0);
  const tip = attention.map((item) => findFood(item.name)?.tip).find(Boolean) ?? FALLBACK_TIP;

  return (
    <View className="flex-1 bg-surface">
      <AppHeader page="Home" />
      <ScrollView
        className="flex-1"
        contentContainerClassName="w-full max-w-[480px] self-center px-margin pt-1 pb-8 gap-space-lg">
        {/* Welcome & Reassuring Header */}
        <View className="flex-row items-center justify-between pt-1">
          <View className="flex-col flex-1">
            <View className="flex-row items-center gap-space-xs">
              <Text className="font-headline-lg text-headline-lg text-on-surface dark:font-bold">
                {userName ? `${greeting()}, ${userName}` : greeting()}
              </Text>
              <Text className="text-[20px]">🌱</Text>
            </View>
            <View className="flex-row items-center gap-1.5 mt-0.5">
              <View className="w-2 h-2 rounded-full bg-secondary-container dark:bg-secondary" />
              <Text className="font-body-md text-body-md text-on-surface-variant">
                {attention.length === 0
                  ? 'Everything is fresh this week'
                  : `${attention.length} ${attention.length === 1 ? 'item needs' : 'items need'} attention this week`}
              </Text>
            </View>
          </View>
          {/* Mini Radar Status Indicator */}
          <Pressable
            accessibilityLabel="Open inventory"
            onPress={() => router.navigate('/inventory')}
            className="relative items-center justify-center w-12 h-12 rounded-full bg-surface-container-low active:scale-95 dark:bg-surface-container dark:border dark:border-outline-variant/60"
            style={shadow('sm')}>
            <View className="absolute inset-1 rounded-full bg-primary/10 dark:bg-primary/20" />
            <View className="w-9 h-9 rounded-full bg-primary items-center justify-center">
              <Icon name="radar" filled className="text-[20px] text-on-primary" />
            </View>
          </Pressable>
        </View>

        {/* Quick Stats Counter Row */}
        <View className="flex-row gap-space-sm">
          <StatCard icon="inventory_2" tile="bg-surface-container-low" iconColor="text-primary" value={String(items.length)} label="Pantry Items" onPress={() => router.navigate('/inventory')} />
          <StatCard icon="timer" tile={tone.coralTile} iconColor="text-tertiary" valueColor="text-tertiary" value={String(attention.length)} label="Expiring Soon" onPress={() => router.navigate('/inventory')} />
          <StatCard icon="savings" tile={tone.amberTile} iconColor="text-secondary" value={`$${Math.round(month.savedCents / 100)}`} label="Saved Month" onPress={() => router.navigate('/profile')} />
        </View>

        {/* Smart Cooking Nudge Card */}
        {nudge && (
          <View
            className={`relative overflow-hidden rounded-xl p-space-md flex-col gap-space-sm ${tone.card} dark:border-outline-variant/70`}
            style={shadow('hero')}>
            <View className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-secondary-container/20 dark:bg-secondary/10 opacity-60" />
            <View className="flex-row items-center justify-between">
              <View className={`flex-row items-center gap-1.5 px-2.5 py-1 rounded-full ${tone.soonBg}`}>
                <Icon name="auto_awesome" filled className={`text-[15px] ${tone.soonText}`} />
                <Text className={`font-label-sm text-label-sm uppercase tracking-wider ${tone.soonText}`}>Smart Nudge</Text>
              </View>
              <View className="flex-row items-center gap-1">
                <Icon name="eco" className="text-[16px] text-primary" />
                <Text className="font-label-sm text-label-sm text-on-surface-variant">
                  Saves {nudge.rescues.length} {nudge.rescues.length === 1 ? 'item' : 'items'}
                </Text>
              </View>
            </View>
            <View className="flex-row gap-space-md items-center mt-1">
              <View className="w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-surface-container">
                <Image source={imageSource(nudge.recipe.image)} style={{ width: '100%', height: '100%' }} contentFit="cover" />
              </View>
              <View className="flex-col min-w-0 flex-1">
                <Text numberOfLines={1} className="font-headline-sm text-headline-sm text-on-surface leading-tight">
                  {nudge.recipe.title}
                </Text>
                <Text numberOfLines={2} className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                  Uses your {nudge.rescues[0].item!.name.replace(/\s*\(.*\)$/, '')}{' '}
                  <Text className="font-body-sm text-body-sm text-tertiary font-semibold">
                    ({expiresPhrase(nudge.rescues[0].days!)})
                  </Text>
                  {nudge.rescues[1] ? ` & ${nudge.rescues[1].ingredient.name}` : ''} before they spoil!
                </Text>
                <View className="flex-row items-center gap-2 mt-1.5">
                  <View className="flex-row items-center gap-0.5">
                    <Icon name="schedule" className="text-[14px] text-on-surface-variant" />
                    <Text className="font-label-sm text-label-sm text-on-surface-variant">{nudge.recipe.minutes} mins</Text>
                  </View>
                  <Text className="text-outline-variant">•</Text>
                  <Text className="font-label-sm text-label-sm text-on-surface-variant">
                    {nudge.recipe.difficulty === 'Easy Prep' ? 'Easy' : nudge.recipe.difficulty}
                  </Text>
                </View>
              </View>
            </View>
            <Pressable
              onPress={() => router.push(`/recipe/${nudge.recipe.id}`)}
              className="w-full mt-2 h-11 px-4 rounded-full bg-primary flex-row items-center justify-center gap-2 active:scale-[0.98]"
              style={shadow('primaryButton')}>
              <Text className="font-label-lg text-label-lg text-on-primary dark:font-semibold">View Recipe Steps</Text>
              <Icon name="arrow_forward" className="text-[18px] text-on-primary" />
            </Pressable>
          </View>
        )}

        {/* Expiring Soon Carousel */}
        <View className="flex-col gap-space-sm">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <Text className="font-headline-sm text-headline-sm text-on-surface">Expiring Soon</Text>
              {attention.length > 0 && (
                <View className={`w-5 h-5 rounded-full items-center justify-center ${tone.urgentBg}`}>
                  <Text className={`text-[11px] font-bold ${tone.urgentText}`}>{attention.length}</Text>
                </View>
              )}
            </View>
            <Pressable onPress={() => router.navigate('/inventory')} className="flex-row items-center gap-0.5">
              <Text className="font-label-md text-label-md text-primary">View All ({items.length})</Text>
              <Icon name="chevron_right" className="text-[16px] text-primary" />
            </Pressable>
          </View>
          {upcoming.length === 0 ? (
            <View className={`rounded-xl p-space-md flex-row items-center gap-space-sm ${tone.card}`} style={shadow('card')}>
              <Text className="text-[22px]">🎉</Text>
              <Text className="font-body-sm text-body-sm text-on-surface-variant flex-1">
                Nothing expires in the next week. Your kitchen is in great shape!
              </Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={256}
              decelerationRate="fast"
              className="-mx-margin"
              contentContainerClassName="px-margin pb-2 gap-space-md">
              {upcoming.map((item) => (
                <ExpiringCard key={item.id} item={item} />
              ))}
            </ScrollView>
          )}
        </View>

        {/* Zero Waste Streak & Kitchen Eco Health */}
        <View className={`rounded-xl p-space-md flex-col gap-space-md ${tone.card}`} style={shadow('card')}>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-space-xs">
              <Text className="text-[22px]">🔥</Text>
              <View className="flex-col">
                <Text className="font-label-lg text-label-lg text-on-surface font-bold leading-tight">Zero Waste Streak</Text>
                <Text className="font-label-sm text-label-sm text-primary font-semibold">
                  {streak} {streak === 1 ? 'Day' : 'Days'} Clean Pantry
                </Text>
              </View>
            </View>
            {month.freshnessPct >= 80 && month.rescuedItems > 0 && (
              <View className={`px-2.5 py-1 rounded-full ${tone.greenTint}`}>
                <Text className="font-label-sm text-label-sm text-primary font-bold">Great pace 🏆</Text>
              </View>
            )}
          </View>
          <View className={`flex-row items-center gap-space-md p-3 rounded-xl ${tone.insetLow}`}>
            <ProgressRing percent={month.freshnessPct} />
            <View className="flex-col flex-1">
              <Text className="font-label-md text-label-md text-on-surface font-semibold">Pantry Freshness Index</Text>
              <Text className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                {month.rescuedItems > 0 ? (
                  <>
                    You’ve rescued{' '}
                    <Text className="font-body-sm text-body-sm font-semibold text-primary">
                      {month.rescuedItems} {month.rescuedItems === 1 ? 'item' : 'items'}
                    </Text>{' '}
                    from going bad this month. Keep it up!
                  </>
                ) : (
                  'Mark items as used when you eat them and your rescues will show up here.'
                )}
              </Text>
            </View>
          </View>
          <View className="flex-row items-center justify-between pt-1">
            <View className="flex-row items-center gap-1">
              <Icon name="verified" className="text-[16px] text-primary" />
              <Text className="font-label-sm text-label-sm text-on-surface-variant">Smart nudges keep watch for you</Text>
            </View>
            <Pressable onPress={() => router.navigate('/profile')}>
              <Text className="font-label-sm text-label-sm text-primary font-semibold">History</Text>
            </Pressable>
          </View>
        </View>

        {/* Gentle Domestic Delight Note */}
        <View className={`p-3 rounded-xl flex-row items-center justify-center gap-2 ${tone.inset} dark:border-outline-variant/60`}>
          <Icon name="tips_and_updates" className="text-[18px] text-primary" />
          <Text className="font-body-sm text-body-sm text-on-surface-variant text-center flex-shrink">Pro tip: {tip}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function StatCard({
  icon,
  tile,
  iconColor,
  valueColor = 'text-on-surface',
  value,
  label,
  onPress,
}: {
  icon: 'inventory_2' | 'timer' | 'savings';
  tile: string;
  iconColor: string;
  valueColor?: string;
  value: string;
  label: string;
  onPress: () => void;
}) {
  const shadow = useShadow();
  return (
    <Pressable
      onPress={onPress}
      className={`flex-1 flex-col p-3.5 rounded-xl active:scale-[0.98] ${tone.card}`}
      style={shadow('statCard')}>
      <View className={`w-8 h-8 rounded-lg items-center justify-center mb-2 ${tile}`}>
        <Icon name={icon} filled className={`text-[18px] ${iconColor}`} />
      </View>
      <Text className={`font-headline-lg text-headline-lg font-bold ${valueColor}`}>{value}</Text>
      <Text numberOfLines={1} className="font-label-sm text-label-sm text-on-surface-variant">
        {label}
      </Text>
    </Pressable>
  );
}

function ExpiringCard({ item }: { item: PantryItem }) {
  const shadow = useShadow();
  const [saved, setSaved] = useState(false);
  const days = daysLeft(item);
  const urgency = urgencyFor(days);
  const colors = urgencyTone[urgency];
  const food = findFood(item.name);
  const hasRecipe = food ? recipesUsing(food.key).length > 0 : false;

  const action =
    urgency === 'urgent' || urgency === 'expired'
      ? { label: 'Use', primary: true, run: () => { setSaved(true); setTimeout(() => markUsed(item.id), 900); } }
      : urgency === 'soon' && hasRecipe
        ? { label: 'Recipe', primary: false, run: () => router.navigate('/recipes') }
        : urgency === 'fresh' && item.zone !== 'freezer'
          ? { label: 'Freeze', primary: false, run: () => { setSaved(true); setTimeout(() => freezeItem(item.id), 900); } }
          : { label: 'Check', primary: false, run: () => router.push(`/item/${item.id}`) };

  const qty = `${item.quantity} ${item.unit}${item.remainingPct < 100 ? ` (${item.remainingPct}% left)` : ''}`;

  return (
    <Pressable
      onPress={() => router.push(`/item/${item.id}`)}
      className={`shrink-0 w-[240px] flex-col justify-between p-3.5 rounded-xl ${tone.card}`}
      style={shadow('card')}>
      <View className="flex-col gap-2.5">
        <View className="flex-row items-start justify-between">
          <FoodThumb item={item} size={48} />
          <UrgencyPill urgency={urgency} label={shortCountdown(days)} />
        </View>
        <View>
          <Text className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
            {categories[item.category].short}
          </Text>
          <Text numberOfLines={1} className="font-label-lg text-label-lg text-on-surface font-semibold">
            {item.name}
          </Text>
          <Text numberOfLines={1} className="font-body-sm text-body-sm text-on-surface-variant">
            Qty: {qty}
          </Text>
        </View>
      </View>
      <View className={`mt-3 pt-2.5 flex-row items-center justify-between ${tone.darkDivider}`}>
        <View className="flex-row items-center gap-1">
          {(urgency === 'urgent' || urgency === 'expired') && (
            <Icon name="warning" className={`text-[14px] ${colors.accent}`} />
          )}
          <Text className={`font-label-sm text-label-sm font-semibold ${colors.accent}`}>
            {urgency === 'fresh' ? 'Fresh zone' : relativeExpiry(days)}
          </Text>
        </View>
        <Pressable
          onPress={action.run}
          disabled={saved}
          className={`flex-row items-center gap-1 px-3 py-1 rounded-full active:scale-95 ${
            saved
              ? 'bg-primary'
              : action.primary
                ? 'bg-primary-fixed dark:bg-primary'
                : 'bg-surface-container-high dark:bg-surface-container-highest'
          }`}>
          {saved && <Icon name="check" className="text-[14px] text-on-primary" />}
          <Text
            className={`font-label-sm text-label-sm font-semibold ${
              saved ? 'text-on-primary' : action.primary ? 'text-on-primary-fixed dark:text-on-primary' : 'text-on-surface'
            }`}>
            {saved ? 'Saved!' : action.label}
          </Text>
        </Pressable>
      </View>
    </Pressable>
  );
}
