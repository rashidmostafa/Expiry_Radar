import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Share, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BarChart, ChartLegend } from '@/components/bar-chart';
import { FoodThumb } from '@/components/food-thumb';
import { Icon, type IconName } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { imageSource } from '@/data/images';
import { getRecipe } from '@/data/recipes';
import { categories } from '@/domain/categories';
import { formatShort, toISODate } from '@/domain/dates';
import { findFood } from '@/domain/foods';
import { formatMoney } from '@/domain/format';
import {
  bestRecipe,
  categoryHealth,
  changePct,
  householdTier,
  keyRescues,
  kitchenAudit,
  periodRange,
  series,
  totals,
  within,
  type Period,
} from '@/domain/insights';
import { useEvents } from '@/store/pantry';
import { useShadow } from '@/theme/shadows';
import { useTheme } from '@/theme/theme-provider';
import { tone } from '@/theme/tones';

const PERIODS: { value: Period; label: string; report: string; compare: string }[] = [
  { value: 'week', label: 'This Week', report: 'Weekly Impact Report', compare: 'last week' },
  { value: 'month', label: 'This Month', report: 'Monthly Impact Report', compare: 'last month' },
  { value: '90d', label: 'Past 90 Days', report: 'Quarterly Impact Report', compare: 'prior 90 days' },
  { value: 'all', label: 'All', report: 'All-Time Impact Report', compare: '' },
];

export default function InsightsScreen() {
  const insets = useSafeAreaInsets();
  const shadow = useShadow();
  const { colors, scheme } = useTheme();
  const events = useEvents();
  const [period, setPeriod] = useState<Period>('week');
  const [selected, setSelected] = useState<number | undefined>();
  // Frozen for the life of the screen so every figure agrees on what "now" is.
  const [now] = useState(() => new Date());

  const meta = PERIODS.find((entry) => entry.value === period)!;
  const range = periodRange(period, events, now);
  const current = within(events, range.start, range.end);
  const previous = within(events, range.prevStart, range.prevEnd);
  const t = totals(current);
  // Only compare when the ledger actually covers the whole previous window.
  const firstEvent = events.at(-1)?.at;
  const comparable = period !== 'all' && !!firstEvent && firstEvent <= range.prevStart.toISOString();
  const change = comparable ? changePct(t.savedCents, totals(previous).savedCents) : undefined;
  const bars = series(events, range.buckets);
  const days = Math.max(1, Math.ceil((Math.min(range.end.getTime(), now.getTime()) - range.start.getTime()) / 86_400_000));
  const best = bestRecipe(current);
  const bestRecipeData = best ? getRecipe(best.recipeId) : undefined;
  const health = categoryHealth(current).filter((entry) => entry.events > 0).slice(0, 5);
  const rescues = keyRescues(current);
  const audit = kitchenAudit(events);
  const tier = householdTier(events);
  const focus = selected !== undefined ? range.buckets[selected] : undefined;
  const focusEvents = focus ? within(events, focus.start, focus.end) : [];
  const focusTotals = totals(focusEvents);

  const share = () =>
    Share.share({
      message: `${meta.report}: I saved ${formatMoney(t.savedCents)} and kept ${(t.gramsDiverted / 1000).toFixed(1)} kg of food out of the bin (${t.co2Kg.toFixed(1)} kg CO₂e) with Expiry Radar 🌱`,
    }).catch(() => {});

  return (
    <View className="flex-1 bg-surface">
      <ScrollView className="flex-1" contentContainerClassName="w-full max-w-[480px] self-center px-margin gap-space-lg" contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 }}>
        {/* Header */}
        <View className="flex-row items-start justify-between">
          <View className="flex-row items-start gap-2 flex-1">
            <Pressable accessibilityLabel="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} className="w-9 h-9 -ml-1 rounded-full items-center justify-center">
              <Icon name="arrow_back" className="text-[22px] text-on-surface" />
            </Pressable>
            <View className="flex-1">
              <Text className="font-label-sm text-label-sm text-primary uppercase tracking-wider font-bold">{meta.report}</Text>
              <Text className="font-headline-xl-mobile text-headline-xl-mobile text-on-surface">Waste & Savings</Text>
            </View>
          </View>
          <Pressable accessibilityLabel="Share report" onPress={share} className="w-10 h-10 rounded-full bg-surface-container-high dark:bg-surface-container items-center justify-center">
            <Icon name="ios_share" className="text-[20px] text-on-surface" />
          </Pressable>
        </View>
        <View className="flex-row items-center justify-between -mt-3">
          <View className="flex-row items-center gap-1.5">
            <Icon name="calendar_today" className="text-[16px] text-on-surface-variant" />
            <Text className="font-body-sm text-body-sm text-on-surface-variant">
              {formatShort(toISODate(range.start))} – {formatShort(toISODate(new Date(Math.min(range.end.getTime(), now.getTime()))))}
            </Text>
          </View>
          <View className="flex-row items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-container-high dark:bg-surface-container">
            <View className="w-1.5 h-1.5 rounded-full bg-primary" />
            <Text className="font-label-sm text-label-sm text-on-surface-variant">Live Audit</Text>
          </View>
        </View>

        {/* Period tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-margin -mt-2" contentContainerClassName="px-margin gap-2">
          {PERIODS.map((entry) => {
            const active = entry.value === period;
            return (
              <Pressable
                key={entry.value}
                onPress={() => {
                  setPeriod(entry.value);
                  setSelected(undefined);
                }}
                className={`px-4 py-2 rounded-full ${active ? 'bg-primary' : 'bg-surface-container-low dark:bg-surface-container'}`}>
                <Text className={`font-label-md text-label-md ${active ? 'text-on-primary font-semibold' : 'text-on-surface-variant'}`}>{entry.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Hero */}
        <View className="rounded-3xl overflow-hidden" style={shadow('card')}>
          <LinearGradient colors={scheme === 'dark' ? ['#1C382B', colors['surface-container']] : [colors.primary, colors['primary-container']]} style={{ padding: 20, gap: 16 }}>
            <View className="absolute -right-6 -bottom-8 opacity-10">
              <Icon name="eco" filled className="text-[140px] text-on-primary dark:text-primary" />
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="font-label-md text-label-md text-on-primary/80 dark:text-on-surface-variant">Net Household Savings</Text>
              {change !== undefined && (
                <View className="flex-row items-center gap-1 px-2 py-0.5 rounded-full bg-on-primary/15 dark:bg-primary/15">
                  <Icon name={change >= 0 ? 'trending_up' : 'trending_down'} className="text-[14px] text-on-primary dark:text-primary" />
                  <Text className="font-label-sm text-label-sm text-on-primary dark:text-primary">
                    {change >= 0 ? '+' : ''}
                    {change}% vs {meta.compare}
                  </Text>
                </View>
              )}
            </View>
            <View>
              <Text className="text-[40px] leading-[46px] font-bold text-on-primary dark:text-on-surface">
                {formatMoney(t.savedCents)} <Text className="font-headline-sm text-headline-sm text-on-primary/80 dark:text-on-surface-variant">saved</Text>
              </Text>
              <Text className="font-body-sm text-body-sm text-on-primary/80 dark:text-on-surface-variant">
                {t.lastMinuteItems} {t.lastMinuteItems === 1 ? 'ingredient' : 'ingredients'} rescued right before expiry
              </Text>
            </View>
            <View className="flex-row gap-2">
              <HeroTile icon="compost" label="Diverted" value={`${(t.gramsDiverted / 1000).toFixed(1)} kg`} detail="food kept" />
              <HeroTile icon="monitoring" label="Pantry" value={`${t.eatenPct}%`} detail="eaten clean" />
              <HeroTile icon="co2" label="Offset" value={`${t.co2Kg.toFixed(1)} kg`} detail={`~${t.carMiles} mi car`} />
            </View>
          </LinearGradient>
        </View>

        {/* Food rescues chart */}
        <View className={`rounded-2xl p-space-md gap-space-md ${tone.card}`} style={shadow('card')}>
          <View className="flex-row items-start justify-between">
            <View className="flex-1">
              <Text className="font-headline-sm text-headline-sm text-on-surface">{period === 'week' ? 'Daily Food Rescues' : period === 'all' ? 'Monthly Food Rescues' : 'Food Rescues'}</Text>
              <Text className="font-body-sm text-body-sm text-on-surface-variant">Tap a bar to inspect it</Text>
            </View>
            <View className="px-2.5 py-1 rounded-full bg-surface-container-high dark:bg-surface-container-highest items-end">
              <Text className="font-label-sm text-[10px] text-on-surface-variant">Avg</Text>
              <Text className="font-label-sm text-label-sm text-on-surface">{formatMoney(Math.round(t.savedCents / days))}/day</Text>
            </View>
          </View>
          {focus && (
            <View className={`flex-row items-center gap-3 p-3 rounded-xl ${tone.insetLow}`}>
              <View className={`w-9 h-9 rounded-lg items-center justify-center ${tone.freshBg}`}>
                <Icon name="shopping_basket" className="text-[18px] text-primary" />
              </View>
              <View className="flex-1">
                <View className="flex-row items-center justify-between">
                  <Text className="font-label-md text-label-md text-on-surface font-semibold">
                    {period === 'week' ? focus.start.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' }) : `${formatShort(toISODate(focus.start))} – ${formatShort(toISODate(new Date(focus.end.getTime() - 1)))}`}
                  </Text>
                  <Text className="font-label-sm text-label-sm text-primary font-bold">+{formatMoney(focusTotals.savedCents)}</Text>
                </View>
                <Text numberOfLines={1} className="font-body-sm text-body-sm text-on-surface-variant">
                  {focusEvents.length ? [...new Set(focusEvents.map((event) => event.itemName))].join(', ') : 'Nothing logged'}
                </Text>
              </View>
            </View>
          )}
          <BarChart
            bars={bars.map((datum) => ({
              label: datum.label,
              segments: [
                { value: datum.rescued, className: 'bg-primary' },
                { value: datum.lastMinute, className: 'bg-secondary-container' },
                { value: datum.tossed, className: 'bg-tertiary' },
              ],
            }))}
            selected={selected}
            onSelect={(index) => setSelected(index === selected ? undefined : index)}
          />
          <ChartLegend items={[['bg-primary', 'Rescued'], ['bg-secondary-container', 'Near-expiry consumed'], ['bg-tertiary', 'Discarded']]} />
        </View>

        {/* Best rescue */}
        {best && bestRecipeData && (
          <Pressable onPress={() => router.push(`/recipe/${bestRecipeData.id}`)} className={`rounded-2xl overflow-hidden ${tone.card}`} style={shadow('card')}>
            <View className="h-40">
              <Image source={imageSource(bestRecipeData.heroImage ?? bestRecipeData.image)} style={{ width: '100%', height: '100%' }} contentFit="cover" />
              <LinearGradient colors={['transparent', 'rgba(0,0,0,0.65)']} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
              <View className="absolute top-3 right-3 flex-row items-center gap-1 px-2.5 py-1 rounded-full bg-primary-fixed">
                <Icon name="workspace_premium" className="text-[14px] text-on-primary-fixed" />
                <Text className="font-label-sm text-label-sm text-on-primary-fixed">Best Rescue</Text>
              </View>
              <View className="absolute left-4 right-4 bottom-3">
                <Text className="font-label-sm text-label-sm text-primary-fixed uppercase tracking-wider">{meta.label} Hero Dish</Text>
                <Text className="font-headline-md text-headline-md text-white">{bestRecipeData.title}</Text>
              </View>
            </View>
            <View className="p-space-md flex-row items-center justify-between">
              <View className="flex-row items-center gap-3 flex-1">
                <View className="flex-row">
                  {best.items.slice(0, 3).map((name, index) => (
                    <View key={name} className="rounded-full border-2 border-surface-container-lowest dark:border-surface-container" style={{ marginLeft: index ? -8 : 0 }}>
                      <FoodThumb item={{ name, image: findFood(name)?.image, category: findFood(name)?.category ?? 'other' }} size={28} radius={14} />
                    </View>
                  ))}
                </View>
                <Text className="font-body-sm text-body-sm text-on-surface-variant flex-1">
                  {best.items.length} {best.items.length === 1 ? 'ingredient' : 'ingredients'} kept from waste
                </Text>
              </View>
              <Text className="font-headline-sm text-headline-sm text-primary">+{formatMoney(best.cents)}</Text>
            </View>
          </Pressable>
        )}

        {/* Category health */}
        {health.length > 0 && (
          <View className="gap-space-sm">
            <Text className="font-headline-md text-headline-md text-on-surface">Pantry Category Health</Text>
            {health.map((entry) => (
              <View key={entry.category} className={`rounded-2xl p-space-md gap-2.5 ${tone.card}`} style={shadow('sm')}>
                <View className="flex-row items-center gap-3">
                  <View className="w-10 h-10 rounded-xl bg-surface-container-low dark:bg-surface-container-high items-center justify-center">
                    <Text className="text-[20px]">{categories[entry.category].emoji}</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="font-label-lg text-label-lg text-on-surface">{entry.label}</Text>
                    <Text className="font-body-sm text-body-sm text-on-surface-variant">
                      {formatMoney(entry.savedCents)} saved • {entry.tossed === 0 ? 'Zero spoiled' : `${entry.tossed} tossed`}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className={`font-headline-sm text-headline-sm ${entry.eatenPct >= 90 ? 'text-primary' : 'text-secondary'}`}>{entry.eatenPct}%</Text>
                    <Text className="font-label-sm text-label-sm text-on-surface-variant">{entry.eatenPct === 100 ? 'perfect' : 'eaten'}</Text>
                  </View>
                </View>
                <View className="h-2 rounded-full bg-surface-container-high dark:bg-surface-container-highest overflow-hidden flex-row">
                  <View className="h-full bg-primary" style={{ width: `${entry.eatenPct}%` }} />
                  {entry.eatenPct < 100 && <View className="h-full bg-tertiary" style={{ width: `${100 - entry.eatenPct}%` }} />}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Key rescues */}
        {rescues.length > 0 && (
          <View className="gap-space-sm">
            <View className="flex-row items-center justify-between">
              <Text className="font-headline-md text-headline-md text-on-surface">Key Rescues</Text>
              <Text className="font-label-sm text-label-sm text-on-surface-variant">Used before expiration</Text>
            </View>
            <View className="flex-row gap-3">
              {rescues.map((event) => (
                <View key={event.id} className={`flex-1 rounded-2xl p-3 items-center gap-1.5 ${tone.card}`} style={shadow('sm')}>
                  <FoodThumb item={{ name: event.itemName, image: findFood(event.itemName)?.image, category: event.category ?? 'other' }} size={56} radius={28} />
                  <Text numberOfLines={1} className="font-label-md text-label-md text-on-surface text-center">{event.itemName}</Text>
                  <Text numberOfLines={1} className="font-body-sm text-[11px] text-on-surface-variant">
                    {event.recipeId ? getRecipe(event.recipeId)?.title.split(' ').slice(0, 2).join(' ') : (event.daysLeft ?? 0) <= 0 ? 'Saved on the day' : `${event.daysLeft}d before date`}
                  </Text>
                  <Text className="font-label-md text-label-md text-primary">+{formatMoney(event.valueCents)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Kitchen audit */}
        <View className="rounded-3xl p-space-md gap-space-sm bg-surface-container-low dark:bg-surface-container dark:border dark:border-outline-variant/60">
          <View className="flex-row items-center gap-3 mb-1">
            <View className="w-10 h-10 rounded-full bg-primary items-center justify-center">
              <Icon name="radar" className="text-[22px] text-on-primary" />
            </View>
            <View>
              <Text className="font-headline-sm text-headline-sm text-on-surface">Radar Kitchen Audit</Text>
              <Text className="font-body-sm text-body-sm text-on-surface-variant">Patterns from your own history</Text>
            </View>
          </View>
          {audit.map((tip) => (
            <View key={tip.title} className={`rounded-2xl p-space-md gap-1.5 ${tone.card}`}>
              <View className="flex-row items-start justify-between gap-2">
                <View className="flex-row items-center gap-2 flex-1">
                  <Icon name={tip.icon} className={`text-[20px] ${tip.tone === 'good' ? 'text-primary' : 'text-secondary'}`} />
                  <Text className="font-label-lg text-label-lg text-on-surface flex-1">{tip.title}</Text>
                </View>
                <View className={`px-2 py-0.5 rounded-full ${tip.tone === 'good' ? tone.freshBg : tone.soonBg}`}>
                  <Text className={`font-label-sm text-label-sm ${tip.tone === 'good' ? tone.freshText : tone.soonText}`}>{tip.badge}</Text>
                </View>
              </View>
              <Text className="font-body-sm text-body-sm text-on-surface-variant">{tip.body}</Text>
            </View>
          ))}
        </View>

        {/* Household status */}
        <View className={`rounded-3xl p-space-md gap-space-md ${tone.card}`} style={shadow('card')}>
          <View className="flex-row items-center gap-3">
            <View className={`w-12 h-12 rounded-2xl items-center justify-center ${tone.freshBg}`}>
              <Icon name="workspace_premium" filled className="text-[26px] text-primary" />
            </View>
            <View className="flex-1">
              <Text className="font-label-sm text-label-sm text-primary uppercase tracking-wider">Household Status • Level {tier.level}</Text>
              <Text className="font-headline-md text-headline-md text-on-surface">{tier.name}</Text>
            </View>
          </View>
          {tier.nextPoints && (
            <View className="gap-1.5">
              <View className="flex-row justify-between">
                <Text className="font-label-sm text-label-sm text-on-surface-variant">Progress to {tier.next}</Text>
                <Text className="font-label-sm text-label-sm text-on-surface">
                  {tier.points} / {tier.nextPoints} pts
                </Text>
              </View>
              <View className="h-2 rounded-full bg-surface-container-high dark:bg-surface-container-highest overflow-hidden">
                <View className="h-full bg-primary rounded-full" style={{ width: `${Math.min(100, (tier.points / tier.nextPoints) * 100)}%` }} />
              </View>
              <Text className="font-body-sm text-body-sm text-on-surface-variant">
                Rescue {Math.ceil((tier.nextPoints - tier.points) / 10)} more items to reach {tier.next}.
              </Text>
            </View>
          )}
          <View className="flex-row gap-2">
            <Pressable onPress={() => router.push('/insights/trends')} className="flex-1 h-12 rounded-full bg-primary flex-row items-center justify-center gap-2 active:scale-[0.98]" style={shadow('primaryButton')}>
              <Icon name="query_stats" className="text-[20px] text-on-primary" />
              <Text className="font-label-lg text-label-lg text-on-primary">Long-Term Trends</Text>
            </Pressable>
            <Pressable accessibilityLabel="Share report" onPress={share} className="w-12 h-12 rounded-full bg-surface-container-high dark:bg-surface-container-highest items-center justify-center">
              <Icon name="share" className="text-[20px] text-on-surface" />
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function HeroTile({ icon, label, value, detail }: { icon: IconName; label: string; value: string; detail: string }) {
  return (
    <View className="flex-1 rounded-xl p-2.5 bg-on-primary/10 dark:bg-surface-container-high gap-0.5">
      <View className="flex-row items-center gap-1">
        <Icon name={icon} className="text-[14px] text-on-primary/80 dark:text-primary" />
        <Text className="font-label-sm text-label-sm text-on-primary/80 dark:text-on-surface-variant">{label}</Text>
      </View>
      <Text className="font-headline-sm text-headline-sm text-on-primary dark:text-on-surface">{value}</Text>
      <Text numberOfLines={1} className="font-label-sm text-[10px] text-on-primary/70 dark:text-on-surface-variant">{detail}</Text>
    </View>
  );
}
