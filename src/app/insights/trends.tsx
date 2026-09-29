import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Share, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BarChart, ChartLegend } from '@/components/bar-chart';
import { Icon, type IconName } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { imageSource } from '@/data/images';
import { getRecipe } from '@/data/recipes';
import { categories } from '@/domain/categories';
import { formatMoney } from '@/domain/format';
import {
  bestRecipe,
  categoryHealth,
  changePct,
  kitchenAudit,
  milestones,
  totals,
  within,
  yearOutlook,
  yearSeries,
  type BarDatum,
} from '@/domain/insights';
import { useEvents } from '@/store/pantry';
import { useShadow } from '@/theme/shadows';
import { useTheme } from '@/theme/theme-provider';
import { tone } from '@/theme/tones';

type TrendView = 'monthly' | 'yearly' | 'all';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function TrendsScreen() {
  const insets = useSafeAreaInsets();
  const shadow = useShadow();
  const { colors, scheme } = useTheme();
  const events = useEvents();
  const [view, setView] = useState<TrendView>('monthly');

  const now = new Date();
  const year = now.getFullYear();
  const firstYear = events.length ? Math.min(...events.map((event) => new Date(event.at).getFullYear())) : year;
  const years = Array.from({ length: year - firstYear + 1 }, (_, index) => firstYear + index);

  const ytdEvents = within(events, new Date(year, 0, 1), new Date(now.getTime() + 1));
  const lastYearSameTime = within(events, new Date(year - 1, 0, 1), new Date(year - 1, now.getMonth(), now.getDate()));
  const scope = view === 'monthly' ? ytdEvents : events;
  const t = totals(scope);
  const change = view === 'monthly' ? changePct(t.savedCents, totals(lastYearSameTime).savedCents) : undefined;

  const data: BarDatum[] =
    view === 'monthly'
      ? yearSeries(events, year)
      : years.map((entry) => {
          const slice = totals(within(events, new Date(entry, 0, 1), new Date(entry + 1, 0, 1)));
          return { label: String(entry), rescued: slice.rescuedItems, lastMinute: 0, tossed: slice.tossedItems, savedCents: slice.savedCents, wastedCents: slice.wastedCents };
        });
  const bestIndex = data.reduce((best, datum, index) => (datum.savedCents > data[best].savedCents ? index : best), 0);
  const wasteShare = (datum: BarDatum) => (datum.savedCents + datum.wastedCents === 0 ? 0 : datum.wastedCents / (datum.savedCents + datum.wastedCents));
  const firstWithData = data.find((datum) => datum.savedCents + datum.wastedCents > 0);
  const latest = [...data].reverse().find((datum) => datum.savedCents + datum.wastedCents > 0);

  const health = categoryHealth(scope).slice(0, 4);
  const maxSaved = Math.max(1, ...health.map((entry) => entry.savedCents));
  const hero = bestRecipe(scope);
  const heroRecipe = hero ? getRecipe(hero.recipeId) : undefined;
  const heroCooks = hero ? new Set(scope.filter((event) => event.recipeId === hero.recipeId).map((event) => event.at.slice(0, 10))).size : 0;
  const marks = milestones(events);
  const outlook = yearOutlook(events);
  const dynamics = kitchenAudit(scope).slice(0, 2);

  const share = () =>
    Share.share({
      message: `${view === 'monthly' ? `So far in ${year}` : 'Since I started'} I've rescued ${formatMoney(t.savedCents)} of food — ${(t.gramsDiverted / 1000).toFixed(1)} kg kept out of the bin and ${t.co2Kg.toFixed(1)} kg CO₂e avoided with Expiry Radar 🌱`,
    }).catch(() => {});

  return (
    <View className="flex-1 bg-surface">
      <ScrollView className="flex-1" contentContainerClassName="w-full max-w-[480px] self-center px-margin gap-space-lg" contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 }}>
        <View className="flex-row items-start justify-between">
          <View className="flex-row items-start gap-2 flex-1">
            <Pressable accessibilityLabel="Back" onPress={() => router.back()} className="w-9 h-9 -ml-1 rounded-full items-center justify-center">
              <Icon name="arrow_back" className="text-[22px] text-on-surface" />
            </Pressable>
            <View className="flex-1">
              <View className="flex-row items-center gap-1">
                <Icon name="trending_up" className="text-[16px] text-primary" />
                <Text className="font-label-sm text-label-sm text-primary uppercase tracking-wider font-bold">Insights & Analytics</Text>
              </View>
              <Text className="font-headline-xl-mobile text-headline-xl-mobile text-on-surface">Long-Term Trends</Text>
              <Text className="font-body-sm text-body-sm text-on-surface-variant">Monthly & annual spoilage audit</Text>
            </View>
          </View>
          <Pressable accessibilityLabel="Share" onPress={share} className="w-10 h-10 rounded-full bg-surface-container-high dark:bg-surface-container items-center justify-center">
            <Icon name="ios_share" className="text-[20px] text-on-surface" />
          </Pressable>
        </View>

        <View className="flex-row p-1 rounded-full bg-surface-container-high dark:bg-surface-container">
          {(
            [
              ['monthly', 'Monthly'],
              ['yearly', 'Yearly'],
              ['all', 'All-Time'],
            ] as const
          ).map(([value, label]) => (
            <Pressable key={value} onPress={() => setView(value)} className={`flex-1 py-2 rounded-full items-center ${view === value ? 'bg-primary' : ''}`}>
              <Text className={`font-label-md text-label-md ${view === value ? 'text-on-primary font-semibold' : 'text-on-surface-variant'}`}>{label}</Text>
            </Pressable>
          ))}
        </View>

        <View className="flex-row items-center justify-between -mt-2">
          <View className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-low dark:bg-surface-container">
            <Icon name="calendar_month" className="text-[16px] text-on-surface-variant" />
            <Text className="font-label-md text-label-md text-on-surface">
              {view === 'monthly' ? `${year} (Jan – ${MONTHS[now.getMonth()].slice(0, 3)})` : `${firstYear} – ${year}`}
            </Text>
          </View>
          <View className="flex-row items-center gap-1.5">
            <View className="w-1.5 h-1.5 rounded-full bg-primary" />
            <Text className="font-label-sm text-label-sm text-on-surface-variant">
              {data.filter((datum) => datum.savedCents + datum.wastedCents > 0).length} {view === 'monthly' ? 'months' : 'years'} recorded
            </Text>
          </View>
        </View>

        {/* Hero */}
        <View className="rounded-3xl overflow-hidden" style={shadow('card')}>
          <LinearGradient colors={scheme === 'dark' ? ['#1C382B', colors['surface-container']] : [colors.primary, colors['primary-container']]} style={{ padding: 20, gap: 14 }}>
            <View className="flex-row items-center justify-between">
              <Text className="font-label-sm text-label-sm text-on-primary/80 dark:text-on-surface-variant uppercase tracking-wider">{view === 'monthly' ? 'Cumulative YTD Impact' : 'All-Time Impact'}</Text>
              {change !== undefined && totals(lastYearSameTime).savedCents > 0 && (
                <View className="flex-row items-center gap-1 px-2 py-0.5 rounded-full bg-on-primary/15 dark:bg-primary/15">
                  <Icon name={change >= 0 ? 'arrow_upward' : 'arrow_downward'} className="text-[14px] text-on-primary dark:text-primary" />
                  <Text className="font-label-sm text-label-sm text-on-primary dark:text-primary">
                    {change >= 0 ? '+' : ''}
                    {change}% vs {year - 1}
                  </Text>
                </View>
              )}
            </View>
            <Text className="text-[40px] leading-[46px] font-bold text-on-primary dark:text-on-surface">
              {formatMoney(t.savedCents)} <Text className="font-headline-sm text-headline-sm text-on-primary/80 dark:text-on-surface-variant">Rescued</Text>
            </Text>
            <View className="flex-row gap-2">
              <Tile icon="compost" label="Diverted" value={`${(t.gramsDiverted / 1000).toFixed(1)} kg`} detail={`~${Math.round((t.gramsDiverted / 1000) * 2)} meals`} />
              <Tile icon="co2" label="Offset" value={`${t.co2Kg.toFixed(1)} kg`} detail={`~${t.carMiles} mi driven`} />
              <Tile icon="verified" label="Efficiency" value={`${t.eatenPct}%`} detail="eaten, not tossed" />
            </View>
          </LinearGradient>
        </View>

        {/* Trajectory */}
        <View className={`rounded-2xl p-space-md gap-space-md ${tone.card}`} style={shadow('card')}>
          <View className="flex-row items-start justify-between">
            <View className="flex-1">
              <Text className="font-headline-sm text-headline-sm text-on-surface">{view === 'monthly' ? 'Monthly Trajectory' : 'Year by Year'}</Text>
              <Text className="font-body-sm text-body-sm text-on-surface-variant">Savings vs. spoilage</Text>
            </View>
            {data[bestIndex]?.savedCents > 0 && (
              <View className={`px-2.5 py-1 rounded-full ${tone.freshBg}`}>
                <Text className={`font-label-sm text-label-sm ${tone.freshText}`}>
                  Peak: {view === 'monthly' ? MONTHS[bestIndex].slice(0, 3) : data[bestIndex].label}
                </Text>
              </View>
            )}
          </View>
          <ChartLegend items={[['bg-primary', 'Saved / consumed'], ['bg-tertiary', 'Spoiled / waste']]} />
          <BarChart
            bars={data.map((datum) => ({
              label: datum.label,
              segments: [
                { value: datum.savedCents, className: 'bg-primary' },
                { value: datum.wastedCents, className: 'bg-tertiary' },
              ],
            }))}
            peakLabel="Best"
          />
          {firstWithData && latest && firstWithData !== latest && (
            <View className="flex-row items-center justify-between pt-1 dark:border-t dark:border-outline-variant/40">
              <View className="flex-row items-center gap-1.5">
                <Icon name={wasteShare(latest) <= wasteShare(firstWithData) ? 'south' : 'north'} className="text-[16px] text-primary" />
                <Text className="font-label-sm text-label-sm text-on-surface-variant">
                  Spoilage {Math.round(wasteShare(firstWithData) * 100)}% → {Math.round(wasteShare(latest) * 100)}%
                </Text>
              </View>
              <Text className="font-label-sm text-label-sm text-primary font-semibold">
                Best: {formatMoney(data[bestIndex].savedCents)}
              </Text>
            </View>
          )}
        </View>

        {/* Dynamics */}
        <View className="gap-space-sm">
          <View className="flex-row items-center justify-between">
            <Text className="font-headline-md text-headline-md text-on-surface">Kitchen Dynamics</Text>
            <Text className="font-label-sm text-label-sm text-primary">From your history</Text>
          </View>
          {dynamics.map((tip) => (
            <View key={tip.title} className={`rounded-2xl p-space-md flex-row gap-3 ${tone.card}`} style={shadow('sm')}>
              <View className={`w-11 h-11 rounded-xl items-center justify-center ${tip.tone === 'good' ? tone.freshBg : tone.amberTile}`}>
                <Icon name={tip.icon} className={`text-[22px] ${tip.tone === 'good' ? 'text-primary' : 'text-secondary'}`} />
              </View>
              <View className="flex-1 gap-1">
                <View className="flex-row items-center justify-between gap-2">
                  <Text className="font-label-lg text-label-lg text-on-surface flex-1">{tip.title}</Text>
                  <View className={`px-2 py-0.5 rounded-full ${tip.tone === 'good' ? tone.freshBg : tone.soonBg}`}>
                    <Text className={`font-label-sm text-label-sm ${tip.tone === 'good' ? tone.freshText : tone.soonText}`}>{tip.badge}</Text>
                  </View>
                </View>
                <Text className="font-body-sm text-body-sm text-on-surface-variant">{tip.body}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* By category */}
        {health.length > 0 && (
          <View className={`rounded-2xl p-space-md gap-4 ${tone.card}`} style={shadow('card')}>
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="font-headline-sm text-headline-sm text-on-surface">Rescued by Category</Text>
                <Text className="font-body-sm text-body-sm text-on-surface-variant">Food value recovered</Text>
              </View>
              <Text className="font-label-sm text-label-sm text-on-surface-variant">Efficiency</Text>
            </View>
            {health.map((entry) => (
              <View key={entry.category} className="gap-1.5">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2">
                    <Text className="text-[15px]">{categories[entry.category].emoji}</Text>
                    <Text className="font-label-md text-label-md text-on-surface">{entry.label}</Text>
                  </View>
                  <View className="flex-row items-center gap-2">
                    <Text className="font-label-md text-label-md text-on-surface">{formatMoney(entry.savedCents)}</Text>
                    <View className={`px-1.5 rounded ${entry.eatenPct >= 90 ? tone.freshBg : tone.soonBg}`}>
                      <Text className={`font-label-sm text-label-sm ${entry.eatenPct >= 90 ? tone.freshText : tone.soonText}`}>{entry.eatenPct}%</Text>
                    </View>
                  </View>
                </View>
                <View className="h-2 rounded-full bg-surface-container-high dark:bg-surface-container-highest overflow-hidden">
                  <View className="h-full bg-primary rounded-full" style={{ width: `${(entry.savedCents / maxSaved) * 100}%` }} />
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Hero dish */}
        {heroRecipe && hero && (
          <Pressable onPress={() => router.push(`/recipe/${heroRecipe.id}`)} className={`rounded-2xl p-space-md gap-3 ${tone.card}`} style={shadow('card')}>
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-1.5">
                <Icon name="skillet" className="text-[18px] text-on-surface" />
                <Text className="font-label-lg text-label-lg text-on-surface">Hero Waste-Rescuing Dish</Text>
              </View>
              <View className={`px-2 py-0.5 rounded-full ${tone.freshBg}`}>
                <Text className={`font-label-sm text-label-sm ${tone.freshText}`}>{hero.items.length} items rescued</Text>
              </View>
            </View>
            <View className="h-44 rounded-xl overflow-hidden">
              <Image source={imageSource(heroRecipe.heroImage ?? heroRecipe.image)} style={{ width: '100%', height: '100%' }} contentFit="cover" />
              <LinearGradient colors={['transparent', 'rgba(0,0,0,0.6)']} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
              <View className="absolute left-3 bottom-3 right-3">
                <Text className="font-label-sm text-label-sm text-primary-fixed uppercase tracking-wider">Your favorite rescue</Text>
                <Text className="font-headline-md text-headline-md text-white">{heroRecipe.title}</Text>
              </View>
            </View>
            <Text className="font-body-sm text-body-sm text-on-surface-variant">
              Cooked on {heroCooks} {heroCooks === 1 ? 'day' : 'days'}, it turned {hero.items.join(', ').toLowerCase()} into dinner instead of waste — {formatMoney(hero.cents)} of food saved.
            </Text>
          </Pressable>
        )}

        {/* Milestones */}
        <View className="gap-space-sm">
          <View className="flex-row items-center justify-between">
            <Text className="font-headline-md text-headline-md text-on-surface">Milestones</Text>
            <Text className="font-label-sm text-label-sm text-primary">
              {marks.filter((mark) => mark.achieved).length} / {marks.length} Achieved
            </Text>
          </View>
          <View className="flex-row flex-wrap gap-3">
            {marks.map((mark) => (
              <View
                key={mark.id}
                className={`rounded-2xl p-4 items-center gap-1.5 ${mark.achieved ? tone.card : 'bg-surface-container-high dark:bg-surface-container-low'}`}
                style={[{ width: '48%' }, mark.achieved ? shadow('sm') : undefined]}>
                <View className={`w-12 h-12 rounded-full items-center justify-center ${mark.achieved ? tone.freshBg : 'bg-surface-container-highest'}`}>
                  <Icon name={mark.achieved ? mark.icon : 'lock'} className={`text-[24px] ${mark.achieved ? 'text-primary' : 'text-on-surface-variant'}`} />
                </View>
                <Text className="font-label-lg text-label-lg text-on-surface text-center">{mark.title}</Text>
                <Text className="font-body-sm text-body-sm text-on-surface-variant text-center">{mark.detail}</Text>
                <Text className={`font-label-sm text-label-sm ${mark.achieved ? 'text-primary' : 'text-secondary'}`}>{mark.achieved ? 'Unlocked' : mark.progress}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Outlook */}
        <View className={`rounded-2xl p-space-md gap-3 ${tone.card}`} style={shadow('card')}>
          <View className="flex-row items-center gap-3">
            <View className="w-11 h-11 rounded-full bg-surface-container-high dark:bg-surface-container-highest items-center justify-center">
              <Icon name="query_stats" className="text-[22px] text-primary" />
            </View>
            <View className="flex-1">
              <Text className="font-headline-sm text-headline-sm text-on-surface">Year-End {year} Outlook</Text>
              <Text className="font-body-sm text-body-sm text-on-surface-variant">On pace for {formatMoney(outlook.projectedCents)} rescued this year</Text>
            </View>
          </View>
          <View className={`rounded-xl p-3 gap-1.5 ${tone.insetLow}`}>
            <View className="flex-row justify-between">
              <Text className="font-label-sm text-label-sm text-on-surface-variant">Year progress ({now.getMonth() + 1} of 12 months)</Text>
              <Text className="font-label-sm text-label-sm text-primary">{outlook.progressPct}%</Text>
            </View>
            <View className="h-2 rounded-full bg-surface-container-high dark:bg-surface-container-highest overflow-hidden">
              <View className="h-full bg-primary rounded-full" style={{ width: `${outlook.progressPct}%` }} />
            </View>
          </View>
          <Pressable onPress={share} className="h-12 rounded-full bg-primary flex-row items-center justify-center gap-2 active:scale-[0.98]" style={shadow('primaryButton')}>
            <Icon name="share" className="text-[20px] text-on-primary" />
            <Text className="font-label-lg text-label-lg text-on-primary">Share Annual Impact Summary</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function Tile({ icon, label, value, detail }: { icon: IconName; label: string; value: string; detail: string }) {
  return (
    <View className="flex-1 gap-0.5">
      <View className="flex-row items-center gap-1">
        <Icon name={icon} className="text-[14px] text-on-primary/80 dark:text-primary" />
        <Text className="font-label-sm text-label-sm text-on-primary/80 dark:text-on-surface-variant">{label}</Text>
      </View>
      <Text className="font-headline-sm text-headline-sm text-on-primary dark:text-on-surface">{value}</Text>
      <Text numberOfLines={1} className="font-label-sm text-[10px] text-on-primary/70 dark:text-on-surface-variant">{detail}</Text>
    </View>
  );
}
