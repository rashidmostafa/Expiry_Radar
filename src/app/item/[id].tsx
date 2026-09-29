import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { BottomNav } from '@/components/bottom-nav';
import { FoodThumb } from '@/components/food-thumb';
import { Icon } from '@/components/ui/icon';
import { Sheet, SheetOption } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Text, TextInput } from '@/components/ui/text';
import { imageSource } from '@/data/images';
import { alertTitle, describeAlert } from '@/domain/alerts';
import { categories, zoneOrder, zones } from '@/domain/categories';
import { daysBetween, formatShort, today } from '@/domain/dates';
import { daysLeft, expiryBadge, longCountdown, urgencyFor } from '@/domain/expiry';
import { findFood } from '@/domain/foods';
import { formatMoney } from '@/domain/format';
import { indexPantry, matchRecipe } from '@/domain/recipe-match';
import type { PantryItem, Urgency, Zone } from '@/domain/types';
import { consumePortion, freezeItem, markUsed, removeItem, tossItem, updateItem, useActiveItems, useItem } from '@/store/pantry';
import { useRecipeCatalog } from '@/store/recipe-book';
import { useSettings } from '@/store/settings';
import { useShadow } from '@/theme/shadows';
import { useTheme } from '@/theme/theme-provider';
import { tone } from '@/theme/tones';

const WINDOW: Record<Urgency, string> = {
  expired: 'Past date: check it before eating',
  urgent: 'Critical Window: Use Today or Freeze',
  soon: 'Use Soon: plan it into this week',
  fresh: 'Fresh: plenty of time left',
};

const TIMER_PILL: Record<Urgency, string> = {
  expired: 'bg-tertiary-container/90',
  urgent: 'bg-tertiary-container/90',
  soon: 'bg-secondary/90',
  fresh: 'bg-primary/90',
};

const GENERIC_TIP = 'Store it front and center at eye level — the radar works best when you can see what needs eating first.';

export default function ItemDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const item = useItem(id);

  if (!item) {
    return (
      <View className="flex-1 bg-surface">
        <AppHeader page="Inventory" />
        <View className="flex-1 items-center justify-center p-8 gap-3">
          <Text className="font-headline-md text-headline-md">Item not found</Text>
          <Pressable onPress={() => router.back()}>
            <Text className="text-primary font-label-lg text-label-lg">Go back</Text>
          </Pressable>
        </View>
        <BottomNav active="inventory" />
      </View>
    );
  }
  return <ItemDetails item={item} />;
}

function ItemDetails({ item }: { item: PantryItem }) {
  const shadow = useShadow();
  const { scheme, colors } = useTheme();
  const settings = useSettings();
  const pantry = useActiveItems();
  const [sheet, setSheet] = useState<'discard' | 'portion' | 'more' | undefined>();
  const [notes, setNotes] = useState(item.notes ?? '');

  const now = today();
  const days = daysLeft(item, now);
  const urgency = urgencyFor(days);
  const active = item.status === 'active';
  const food = findFood(item.name);
  const valueCents = item.priceCents ?? food?.priceCents;
  const grams = item.weightGrams ?? food?.grams ?? 0;
  const span = Math.max(1, daysBetween(item.purchasedOn, item.expiresOn));
  const elapsedPct = Math.min(100, Math.max(0, Math.round((daysBetween(item.purchasedOn, now) / span) * 100)));
  const organic = /organic/i.test(`${item.name} ${item.detail ?? ''}`);
  const tip = food?.tip ?? GENERIC_TIP;
  const alertWhen = describeAlert(item.expiresOn, settings.alertDaysBefore, settings.alertHour);

  const catalog = useRecipeCatalog();
  const matches = useMemo(() => {
    if (!food) return [];
    const index = indexPantry(pantry);
    return catalog
      .filter((recipe) => recipe.ingredients.some((ingredient) => ingredient.key === food.key))
      .map((recipe) => matchRecipe(recipe, index))
      .sort((a, b) => b.score - a.score);
  }, [catalog, food, pantry]);
  const ready = matches.filter((match) => match.readyPct === 100).length;

  const leave = (action: () => void) => {
    action();
    router.back();
  };

  const switchZone = (zone: Zone) => {
    if (zone === item.zone) return;
    if (zone === 'freezer') freezeItem(item.id);
    else updateItem(item.id, { zone, shelf: undefined });
  };

  const heroSource = imageSource(item.image === 'spinach' ? 'spinach-hero' : item.image);

  return (
    <View className="flex-1 bg-surface">
      <AppHeader page="Inventory" />
      <ScrollView className="flex-1" contentContainerClassName="w-full max-w-[480px] self-center px-margin pb-8">
        {/* Top Navigation Bar / Actions Chrome */}
        <View className="flex-row items-center justify-between py-space-sm mb-space-sm">
          <Pressable
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            className={`w-10 h-10 rounded-full items-center justify-center active:scale-95 ${tone.card}`}
            style={shadow('sm')}>
            <Icon name="arrow_back" className="text-[22px] text-on-surface" />
          </Pressable>
          <View className="flex-col items-center">
            <Text className="font-headline-sm text-headline-sm text-on-surface tracking-tight">Item Details</Text>
            <View className="flex-row items-center gap-1.5 mt-0.5">
              <View className="w-2 h-2 rounded-full bg-secondary-container dark:bg-secondary" />
              <Text className="font-label-sm text-label-sm text-on-surface-variant font-medium">
                {[zones[item.zone].label, item.shelf].filter(Boolean).join(' • ')}
              </Text>
            </View>
          </View>
          <View className="flex-row items-center gap-space-xs">
            <Pressable
              accessibilityLabel="Edit item"
              onPress={() => router.push({ pathname: '/add-item', params: { id: item.id } })}
              className={`w-10 h-10 rounded-full items-center justify-center active:scale-95 ${tone.card}`}
              style={shadow('sm')}>
              <Icon name="edit" className="text-[20px] text-on-surface-variant" />
            </Pressable>
            <Pressable
              accessibilityLabel="More options"
              onPress={() => setSheet('more')}
              className={`w-10 h-10 rounded-full items-center justify-center active:scale-95 ${tone.card}`}
              style={shadow('sm')}>
              <Icon name="more_vert" className="text-[20px] text-on-surface-variant" />
            </Pressable>
          </View>
        </View>

        {/* Hero Showcase Card */}
        <View className={`w-full rounded-xl p-space-md mb-space-md relative overflow-hidden ${tone.card}`} style={shadow('sm')}>
          <View className="relative w-full h-52 rounded-lg overflow-hidden bg-surface-container mb-space-md items-center justify-center">
            {heroSource ? (
              <Image source={heroSource} style={{ width: '100%', height: '100%' }} contentFit="cover" />
            ) : (
              <FoodThumb item={item} size={120} radius={60} className="bg-surface-container-high" />
            )}
            <View className="absolute top-3 left-3 flex-row items-center gap-1.5 bg-surface-container-lowest/90 dark:bg-surface-container/90 px-3 py-1 rounded-full" style={shadow('sm')}>
              <Icon name="eco" className="text-[16px] text-primary" />
              <Text className="font-label-sm text-label-sm text-primary font-bold">
                {organic ? 'Organic Certified' : categories[item.category].label}
              </Text>
            </View>
            <View className={`absolute top-3 right-3 px-3 py-1 rounded-full flex-row items-center gap-1 ${TIMER_PILL[urgency]}`} style={shadow('sm')}>
              <Icon name="timer" className="text-[16px] text-on-tertiary dark:text-surface" />
              <Text className="font-label-sm text-label-sm font-semibold text-on-tertiary dark:text-surface">{longCountdown(days)}</Text>
            </View>
            <View
              className="absolute bottom-3 left-3 right-3 flex-row items-center justify-between bg-surface-container-lowest/95 dark:bg-surface-container/95 px-3 py-2 rounded-lg"
              style={shadow('sm')}>
              <View className="flex-row items-center gap-2 flex-1">
                <View className={`w-2.5 h-2.5 rounded-full ${urgency === 'fresh' ? 'bg-primary' : urgency === 'soon' ? 'bg-secondary' : 'bg-tertiary'}`} />
                <Text numberOfLines={1} className="font-label-sm text-label-sm text-on-surface font-semibold flex-shrink">
                  {WINDOW[urgency]}
                </Text>
              </View>
              <Text className={`font-label-sm text-label-sm font-bold ml-2 ${urgency === 'fresh' ? 'text-primary' : 'text-tertiary'}`}>
                {elapsedPct}% Elapsed
              </Text>
            </View>
          </View>

          {/* Title and Brand */}
          <View className="flex-row items-start justify-between gap-2">
            <View className="flex-1">
              <Text className="font-headline-lg text-headline-lg text-on-surface tracking-tight">{item.name}</Text>
              <Text className="font-body-md text-body-md text-on-surface-variant font-medium mt-0.5">
                {[item.detail, `${item.quantity} ${item.unit}`].filter(Boolean).join(' • ')}
              </Text>
            </View>
            {valueCents !== undefined && (
              <View className="flex-col items-end">
                <Text className="font-headline-sm text-headline-sm text-primary font-bold">{formatMoney(valueCents)}</Text>
                <Text className="font-label-sm text-label-sm text-on-surface-variant">
                  {item.priceCents === undefined ? 'Est. value' : 'Value at risk'}
                </Text>
              </View>
            )}
          </View>

          {/* Expiry Timeline Bar */}
          <View className={`mt-4 p-3.5 rounded-xl ${tone.insetLow}`}>
            <View className="flex-row items-center justify-between mb-2 gap-2">
              <View className="flex-row items-center gap-1.5 flex-1">
                <Icon name="error" className={`text-[18px] ${urgency === 'fresh' ? 'text-primary' : 'text-tertiary'}`} />
                <Text className={`font-label-md text-label-md font-bold ${urgency === 'fresh' ? 'text-primary' : 'text-tertiary'}`}>
                  {expiryBadge(days)}, {formatShort(item.expiresOn)}
                </Text>
              </View>
              {item.openedOn && (
                <Text className="font-label-sm text-label-sm text-on-surface-variant">
                  Opened {formatShort(item.openedOn)} ({daysBetween(item.openedOn, now)}d ago)
                </Text>
              )}
            </View>
            <View className="w-full h-2.5 bg-surface-container dark:bg-surface-container-highest rounded-full overflow-hidden p-0.5">
              <LinearGradient
                colors={[colors.primary, scheme === 'dark' ? colors.secondary : colors['secondary-container'], colors.tertiary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ height: '100%', width: `${Math.max(4, elapsedPct)}%`, borderRadius: 999 }}
              />
            </View>
            <View className="flex-row justify-between items-center mt-2">
              <Text className="font-label-sm text-label-sm text-on-surface-variant">Purchased: {formatShort(item.purchasedOn)}</Text>
              <Text className={`font-label-sm text-label-sm font-semibold ${urgency === 'fresh' ? 'text-primary' : 'text-tertiary'}`}>
                {urgency === 'fresh' ? 'On Track' : urgency === 'soon' ? 'Target: Cook This Week' : 'Target: Cook Today'}
              </Text>
            </View>
          </View>
        </View>

        {/* Primary Interactive Action Buttons (Thumb Zone) */}
        {active && (
          <View className="gap-2.5 mb-space-lg">
            <Pressable
              onPress={() => leave(() => markUsed(item.id))}
              className="w-full h-12 rounded-full bg-primary flex-row items-center justify-center gap-2 active:scale-[0.98]"
              style={shadow('primaryButton')}>
              <Icon name="check_circle" className="text-[22px] text-on-primary" />
              <Text className="font-label-lg text-label-lg text-on-primary">Mark as Fully Consumed</Text>
            </Pressable>
            <View className="flex-row gap-2.5">
              <Pressable
                onPress={() => setSheet('portion')}
                className={`flex-1 h-11 rounded-full flex-row items-center justify-center gap-1.5 active:scale-[0.98] ${tone.card}`}
                style={shadow('sm')}>
                <Icon name="pie_chart" className="text-[18px] text-secondary" />
                <Text className="font-label-md text-label-md text-on-surface">Used Portion</Text>
              </Pressable>
              <Pressable
                disabled={item.zone === 'freezer'}
                onPress={() => freezeItem(item.id)}
                className={`flex-1 h-11 rounded-full flex-row items-center justify-center gap-1.5 active:scale-[0.98] ${tone.card} ${item.zone === 'freezer' ? 'opacity-50' : ''}`}
                style={shadow('sm')}>
                <Icon name="ac_unit" className="text-[18px] text-primary" />
                <Text className="font-label-md text-label-md text-on-surface">
                  {item.zone === 'freezer' ? 'In Freezer' : 'Freeze Remaining'}
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Storage Pro-Tip Callout */}
        <View className="w-full bg-secondary-fixed/50 dark:bg-[#3B2312] dark:border dark:border-[#5D361B] rounded-xl p-space-md mb-space-lg flex-row items-start gap-3" style={shadow('sm')}>
          <View className="w-9 h-9 rounded-full bg-secondary items-center justify-center shrink-0 mt-0.5">
            <Icon name="lightbulb" className="text-[20px] text-on-secondary" />
          </View>
          <View className="flex-1">
            <Text className="font-headline-sm text-headline-sm text-on-secondary-fixed dark:text-secondary tracking-tight">Pro Freshness Tip</Text>
            <Text className="font-body-md text-body-md text-on-secondary-fixed-variant dark:text-on-surface-variant mt-1 leading-relaxed">{tip}</Text>
          </View>
        </View>

        {/* Item Attributes */}
        <View className={`w-full rounded-xl p-space-md mb-space-lg ${tone.card}`} style={shadow('sm')}>
          <View className="flex-row items-center justify-between mb-space-sm">
            <Text className="font-headline-sm text-headline-sm text-on-surface tracking-tight">Item Attributes</Text>
            <Pressable onPress={() => router.push({ pathname: '/add-item', params: { id: item.id } })}>
              <Text className="font-label-sm text-label-sm text-primary font-bold">Edit</Text>
            </Pressable>
          </View>
          <View className="flex-row flex-wrap gap-3">
            <View className={`p-3 rounded-lg w-full ${tone.insetLow}`}>
              <View className="flex-row items-center justify-between mb-2">
                <Text className="font-label-sm text-label-sm text-on-surface-variant font-medium">Storage Location</Text>
                <Text className="font-label-sm text-label-sm text-primary font-semibold">Quick Switch</Text>
              </View>
              <View className="flex-row gap-1.5 bg-surface-container dark:bg-surface-container-highest p-1 rounded-full">
                {(['fridge', 'pantry', 'freezer'] as const).map((zone) => {
                  const selected = zone === item.zone;
                  return (
                    <Pressable
                      key={zone}
                      onPress={() => switchZone(zone)}
                      className={`flex-1 py-1.5 rounded-full flex-row items-center justify-center gap-1 ${selected ? 'bg-surface-container-lowest dark:bg-surface-container-low' : ''}`}
                      style={selected ? shadow('sm') : undefined}>
                      {selected && <Icon name={zones[zone].icon} className="text-[14px] text-primary" />}
                      <Text className={`font-label-sm text-label-sm ${selected ? 'text-on-surface font-semibold' : 'text-on-surface-variant font-medium'}`}>
                        {zones[zone].label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <Attribute label="Estimated Quantity">
              <View className="flex-row items-center justify-between mt-2">
                <Stepper label="Less" onPress={() => updateItem(item.id, { remainingPct: Math.max(10, item.remainingPct - 10) })}>−</Stepper>
                <Text className="font-label-lg text-label-lg text-on-surface font-bold">{item.remainingPct}% left</Text>
                <Stepper label="More" onPress={() => updateItem(item.id, { remainingPct: Math.min(100, item.remainingPct + 10) })}>+</Stepper>
              </View>
            </Attribute>
            <Attribute label="Food Category">
              <View className="flex-row items-center gap-1.5 mt-2">
                <Icon name="nutrition" className="text-[18px] text-primary" />
                <Text numberOfLines={1} className="font-label-md text-label-md text-on-surface font-semibold">
                  {categories[item.category].label}
                </Text>
              </View>
            </Attribute>
            <Attribute label="Source / Receipt">
              <View className="flex-row items-center gap-1 mt-1">
                <Icon
                  name={item.source === 'receipt' ? 'receipt_long' : item.source === 'barcode' ? 'barcode_scanner' : 'edit_note'}
                  className="text-[16px] text-on-surface-variant"
                />
                <Text numberOfLines={1} className="font-label-sm text-label-sm font-medium text-on-surface">
                  {item.source === 'receipt' ? 'Receipt' : item.source === 'barcode' ? 'Barcode' : 'Added by hand'} ({formatShort(item.purchasedOn)})
                </Text>
              </View>
            </Attribute>
            <View className="p-3 rounded-lg flex-col justify-between bg-primary-fixed/40 dark:bg-[#1C382B] dark:border dark:border-[#2B5440]" style={{ width: '48%' }}>
              <Text className="font-label-sm text-label-sm text-on-primary-fixed-variant dark:text-on-surface-variant">Zero-Waste Impact</Text>
              <View className="flex-row items-center gap-1.5 mt-1">
                <Icon name="savings" className="text-[18px] text-primary" />
                <Text className="font-label-md text-label-md text-primary font-bold">
                  +{formatMoney(valueCents ?? 0)} & {((grams / 1000) * 2.5 * (item.remainingPct / 100)).toFixed(1)}kg CO₂
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Cook Before It Expires */}
        {matches.length > 0 && (
          <View className="w-full mb-space-lg">
            <View className="flex-row items-center justify-between mb-space-sm px-1">
              <View className="flex-row items-center gap-2">
                <Text className="font-headline-sm text-headline-sm text-on-surface tracking-tight">Cook Before It Expires</Text>
                {ready > 0 && (
                  <View className={`px-2 py-0.5 rounded-full ${tone.freshBg}`}>
                    <Text className={`font-label-sm text-label-sm font-semibold ${tone.freshText}`}>{ready} ready</Text>
                  </View>
                )}
              </View>
              <Pressable onPress={() => router.dismissTo('/recipes')} className="flex-row items-center">
                <Text className="font-label-sm text-label-sm text-primary font-bold">See all</Text>
                <Icon name="chevron_right" className="text-[16px] text-primary" />
              </Pressable>
            </View>
            <View className="gap-3">
              {matches.slice(0, 3).map((match, index) => {
                const ingredient = match.recipe.ingredients.find((entry) => entry.key === food?.key);
                const pairs = match.recipe.ingredients.filter((entry) => entry.key !== food?.key).map((entry) => entry.name);
                return (
                  <Pressable
                    key={match.recipe.id}
                    onPress={() => router.push(`/recipe/${match.recipe.id}`)}
                    className={`rounded-xl p-space-sm flex-row items-center gap-3.5 active:bg-surface-container-low ${tone.card}`}
                    style={shadow('sm')}>
                    <View className="w-20 h-20 rounded-lg overflow-hidden shrink-0 bg-surface-container relative">
                      <Image source={imageSource(match.recipe.image)} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                      <View className="absolute bottom-1 right-1 bg-surface-container-lowest/90 px-1.5 py-0.5 rounded">
                        <Text className="font-label-sm text-[10px] font-bold text-on-surface">{match.recipe.minutes}m</Text>
                      </View>
                    </View>
                    <View className="flex-1 min-w-0">
                      <View className="flex-row items-center gap-1 mb-1">
                        <Icon name={index === 0 ? 'auto_awesome' : 'bolt'} className={`text-[15px] ${index === 0 ? 'text-primary' : 'text-secondary'}`} />
                        <Text className={`font-label-sm text-label-sm font-bold uppercase tracking-wider ${index === 0 ? 'text-primary' : 'text-secondary'}`}>
                          {ingredient && ingredient.deduct >= 1 ? 'Uses it all' : `Uses ~${Math.round((ingredient?.deduct ?? 0) * 100)}% portion`}
                        </Text>
                      </View>
                      <Text numberOfLines={1} className="font-headline-sm text-[15px] leading-snug text-on-surface font-semibold">
                        {match.recipe.title}
                      </Text>
                      <Text numberOfLines={1} className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                        Pairs with: {pairs.join(', ')}
                      </Text>
                    </View>
                    <View className="w-9 h-9 rounded-full bg-surface-container dark:bg-surface-container-high items-center justify-center shrink-0">
                      <Icon name="arrow_forward" className="text-[20px] text-primary" />
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* Notes & Notification Settings */}
        <View className={`w-full rounded-xl p-space-md mb-space-lg ${tone.card}`} style={shadow('sm')}>
          <View className="flex-row items-center justify-between mb-3">
            <Text className="font-headline-sm text-headline-sm text-on-surface tracking-tight">Pantry Notes & Radar Alerts</Text>
            <Icon name="edit_note" className="text-[18px] text-primary" />
          </View>
          <View className={`rounded-lg p-3 mb-3 ${tone.insetLow}`}>
            <Text className="font-label-sm text-label-sm text-on-surface-variant font-medium mb-1">Personal Usage Plan</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              onBlur={() => updateItem(item.id, { notes: notes.trim() || undefined })}
              placeholder="What's the plan for it? e.g. Saturday omelettes"
              multiline
              className="font-body-md text-body-md text-on-surface min-h-[40px]"
            />
          </View>
          <View className={`flex-row items-center justify-between px-3.5 py-3 rounded-lg ${tone.insetLow}`}>
            <View className="flex-row items-center gap-2.5 flex-1">
              <View className="w-8 h-8 rounded-full bg-primary/10 items-center justify-center">
                <Icon name="notifications_active" className="text-[18px] text-primary" />
              </View>
              <View className="flex-col flex-1">
                <Text className="font-label-md text-label-md text-on-surface font-semibold">{alertTitle(settings.alertDaysBefore)}</Text>
                <Text className="font-label-sm text-label-sm text-on-surface-variant">
                  {!item.alertEnabled ? 'Nudges off for this item' : alertWhen ? `Scheduled for ${alertWhen}` : 'Past the alert window'}
                </Text>
              </View>
            </View>
            <Switch label="Expiry alert" value={item.alertEnabled} onValueChange={(alertEnabled) => updateItem(item.id, { alertEnabled })} />
          </View>
        </View>

        {/* Zero-Waste Motivation & Removal Zone */}
        <View className="w-full flex-col items-center gap-3 pt-2">
          {active && (
            <Pressable onPress={() => setSheet('discard')} className="flex-row items-center gap-1.5 py-2 px-4 rounded-full active:bg-error-container/40">
              <Icon name="delete_sweep" className="text-[18px] text-on-surface-variant" />
              <Text className="font-label-md text-label-md text-on-surface-variant">Mark Finished or Spoilage Discard</Text>
            </Pressable>
          )}
          <Text className="font-label-sm text-label-sm text-on-surface-variant/80 text-center max-w-xs">
            Item recorded on {formatShort(item.createdAt.slice(0, 10))} • Tracked in Expiry Radar {zones[item.zone].label}
          </Text>
        </View>
      </ScrollView>
      <BottomNav active="inventory" />

      <Sheet visible={sheet === 'portion'} onClose={() => setSheet(undefined)} title="How much did you use?" subtitle={`${item.remainingPct}% of ${item.name} left`}>
        {[25, 50, 75].filter((pct) => pct < item.remainingPct).map((pct) => (
          <SheetOption key={pct} icon="pie_chart" label={`About ${pct}%`} detail={`${item.remainingPct - pct}% stays tracked`} onPress={() => { consumePortion(item.id, pct); setSheet(undefined); }} />
        ))}
        <SheetOption icon="check_circle" label="All of it" detail="Mark as fully consumed" onPress={() => { setSheet(undefined); leave(() => markUsed(item.id)); }} />
      </Sheet>

      <Sheet visible={sheet === 'discard'} onClose={() => setSheet(undefined)} title="What happened to it?" subtitle="Every bit of tracking helps your weekly report.">
        <SheetOption icon="restaurant" label="Finished it" detail="Counts toward food you rescued" onPress={() => { setSheet(undefined); leave(() => markUsed(item.id)); }} />
        <SheetOption icon="compost" label="It spoiled" detail="No worries — logged so the radar can nudge earlier" onPress={() => { setSheet(undefined); leave(() => tossItem(item.id)); }} destructive />
      </Sheet>

      <Sheet visible={sheet === 'more'} onClose={() => setSheet(undefined)} title={item.name}>
        <SheetOption icon="edit" label="Edit details" onPress={() => { setSheet(undefined); router.push({ pathname: '/add-item', params: { id: item.id } }); }} />
        {zoneOrder.filter((zone) => zone !== item.zone).map((zone) => (
          <SheetOption key={zone} icon={zones[zone].icon} label={`Move to ${zones[zone].label}`} onPress={() => { switchZone(zone); setSheet(undefined); }} />
        ))}
        <SheetOption icon="delete" label="Delete without logging" detail="For items added by mistake" destructive onPress={() => { setSheet(undefined); leave(() => removeItem(item.id)); }} />
      </Sheet>
    </View>
  );
}

function Attribute({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className={`p-3 rounded-lg flex-col justify-between ${tone.insetLow}`} style={{ width: '48%' }}>
      <Text className="font-label-sm text-label-sm text-on-surface-variant">{label}</Text>
      {children}
    </View>
  );
}

function Stepper({ label, onPress, children }: { label: string; onPress: () => void; children: string }) {
  const shadow = useShadow();
  return (
    <Pressable
      accessibilityLabel={label}
      onPress={onPress}
      className="w-7 h-7 rounded-full bg-surface-container-lowest dark:bg-surface-container-highest items-center justify-center active:scale-95"
      style={shadow('sm')}>
      <Text className="font-bold text-on-surface">{children}</Text>
    </Pressable>
  );
}
