import { Image } from 'expo-image';
import { router } from 'expo-router';
import * as Speech from 'expo-speech';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FoodThumb } from '@/components/food-thumb';
import { Icon, type IconName } from '@/components/ui/icon';
import { Switch } from '@/components/ui/switch';
import { Text } from '@/components/ui/text';
import { imageSource } from '@/data/images';
import { zones } from '@/domain/categories';
import { addDays, today } from '@/domain/dates';
import { daysLeft, shortCountdown, urgencyFor } from '@/domain/expiry';
import { findFood, shelfLifeFor } from '@/domain/foods';
import { formatMoney } from '@/domain/format';
import type { ItemEvent, PantryItem } from '@/domain/types';
import { freezeItem, rescheduleNudges, updateItem, useActiveItems, useEvents, useItems } from '@/store/pantry';
import { useRankedRecipes } from '@/store/recipe-book';
import { formatClock, updateSettings, useSettings } from '@/store/settings';
import { useShadow } from '@/theme/shadows';
import { tone } from '@/theme/tones';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DIGEST_TIMES = [7 * 60, 7 * 60 + 30, 8 * 60, 8 * 60 + 30, 9 * 60];

export default function DigestScreen() {
  const insets = useSafeAreaInsets();
  const shadow = useShadow();
  const settings = useSettings();
  const items = useActiveItems();
  const allItems = useItems();
  const events = useEvents();
  const ranked = useRankedRecipes();
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => () => void Speech.stop(), []);

  const now = new Date();
  const counts = { fresh: 0, peak: 0, soon: 0, expired: 0 };
  for (const item of items) {
    const urgency = urgencyFor(daysLeft(item));
    if (urgency === 'fresh') counts.fresh++;
    else if (urgency === 'soon') counts.peak++;
    else if (urgency === 'urgent') counts.soon++;
    else counts.expired++;
  }
  const total = Math.max(1, items.length);
  const freshPct = Math.round(((counts.fresh + counts.peak) / total) * 100);
  const urgent = items.filter((item) => daysLeft(item) <= 1).slice(0, 3);
  const rescue = ranked.find((match) => match.rescues.length > 0);
  const log = activityLog(allItems, events);

  const summary = [
    `Good ${now.getHours() < 12 ? 'morning' : now.getHours() < 18 ? 'afternoon' : 'evening'}${settings.userName ? `, ${settings.userName}` : ''}.`,
    items.length ? `Your pantry is ${freshPct} percent fresh.` : 'Your pantry is empty right now.',
    urgent.length
      ? `${urgent.length === 1 ? 'One item needs' : `${urgent.length} items need`} using today: ${urgent.map((item) => item.name.replace(/\s*\(.*\)$/, '')).join(', ')}.`
      : 'Nothing needs using today.',
    rescue ? `Tonight's rescue idea is ${rescue.recipe.title}, ready in ${rescue.recipe.minutes} minutes.` : '',
  ].join(' ');

  const listen = () => {
    if (speaking) {
      Speech.stop();
      setSpeaking(false);
      return;
    }
    setSpeaking(true);
    Speech.speak(summary, { rate: 0.95, onDone: () => setSpeaking(false), onStopped: () => setSpeaking(false), onError: () => setSpeaking(false) });
  };

  const setSchedule = (patch: Parameters<typeof updateSettings>[0]) => {
    updateSettings(patch);
    rescheduleNudges();
  };

  return (
    <View className="flex-1 bg-surface">
      <View className="px-margin flex-row items-center justify-between w-full max-w-[480px] self-center" style={{ paddingTop: insets.top + 8, paddingBottom: 8 }}>
        <Pressable accessibilityLabel="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} className={`w-11 h-11 rounded-full items-center justify-center ${tone.card}`} style={shadow('sm')}>
          <Icon name="arrow_back" className="text-[22px] text-on-surface" />
        </Pressable>
        <View className="items-center">
          <Text className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest">Morning Briefing</Text>
          <Text className="font-headline-sm text-headline-sm text-on-surface">Daily Freshness Digest</Text>
        </View>
        <Pressable accessibilityLabel="Smart nudges" onPress={() => router.push('/nudges')} className={`w-11 h-11 rounded-full items-center justify-center ${tone.card}`} style={shadow('sm')}>
          <Icon name="notifications" className="text-[22px] text-on-surface" />
        </Pressable>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="w-full max-w-[480px] self-center px-margin pb-6 gap-space-lg">
        <View className="self-center flex-row items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high dark:bg-surface-container">
          <Icon name="wb_twilight" className="text-[16px] text-on-surface-variant" />
          <Text className="font-label-sm text-label-sm text-on-surface-variant">
            Today, {WEEKDAYS[now.getDay()]}, {MONTHS[now.getMonth()]} {now.getDate()}
            {settings.digestAt !== null ? ` • ${formatClock(settings.digestAt)}` : ''}
          </Text>
        </View>

        {/* Household pulse */}
        <View className={`rounded-2xl p-space-md gap-space-md ${tone.card}`} style={shadow('card')}>
          <View className="flex-row items-start justify-between">
            <View className="flex-1">
              <Text className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Household Pulse</Text>
              <Text className="font-headline-lg text-headline-lg text-on-surface font-bold">
                {items.length ? `Your Pantry is ${freshPct}% Fresh` : 'Your pantry is empty'}
              </Text>
            </View>
            <View className={`w-12 h-12 rounded-full items-center justify-center ${tone.freshBg}`}>
              <Icon name="eco" className="text-[24px] text-primary" />
            </View>
          </View>
          {items.length > 0 && (
            <>
              <View className="flex-row h-3 rounded-full overflow-hidden gap-0.5">
                {counts.fresh > 0 && <View className="bg-primary" style={{ flex: counts.fresh }} />}
                {counts.peak > 0 && <View className="bg-primary-container" style={{ flex: counts.peak }} />}
                {counts.soon > 0 && <View className="bg-secondary-container" style={{ flex: counts.soon }} />}
                {counts.expired > 0 && <View className="bg-tertiary" style={{ flex: counts.expired }} />}
              </View>
              <View className="flex-row flex-wrap gap-x-4 gap-y-1">
                <Legend dot="bg-primary" label={`${counts.fresh} fresh 5d+`} />
                <Legend dot="bg-primary-container" label={`${counts.peak} at peak`} />
                <Legend dot="bg-secondary-container" label={`${counts.soon} cook soon`} />
                {counts.expired > 0 && <Legend dot="bg-tertiary" label={`${counts.expired} past date`} />}
              </View>
            </>
          )}
          <Pressable onPress={listen} className={`flex-row items-center gap-3 p-3 rounded-xl ${tone.insetLow}`}>
            <View className="w-11 h-11 rounded-full bg-primary items-center justify-center">
              <Icon name={speaking ? 'stop' : 'play_arrow'} filled className="text-[24px] text-on-primary" />
            </View>
            <View className="flex-1">
              <Text className="font-label-md text-label-md text-on-surface font-semibold">{speaking ? 'Reading your digest…' : 'Listen to Audio Digest'}</Text>
              <Text numberOfLines={1} className="font-body-sm text-body-sm text-on-surface-variant">
                {urgent[0] ? `${urgent[0].name.replace(/\s*\(.*\)$/, '')} needs priority cooking` : 'A 20-second summary of your kitchen'}
              </Text>
            </View>
            <Icon name="graphic_eq" className={`text-[24px] ${speaking ? 'text-primary' : 'text-on-surface-variant'}`} />
          </Pressable>
        </View>

        {/* Urgent attention */}
        {urgent.length > 0 && (
          <View className="gap-space-sm">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <Icon name="warning" className="text-[22px] text-tertiary" />
                <Text className="font-headline-md text-headline-md text-on-surface">Urgent Attention</Text>
              </View>
              <View className={`px-2 py-0.5 rounded-full ${tone.urgentBg}`}>
                <Text className={`font-label-sm text-label-sm ${tone.urgentText}`}>
                  {urgent.length} {urgent.length === 1 ? 'item' : 'items'} &lt; 48h
                </Text>
              </View>
            </View>
            {urgent.map((item) => (
              <UrgentCard key={item.id} item={item} />
            ))}
          </View>
        )}

        {/* Tonight's rescue */}
        {rescue && (
          <View className="rounded-2xl p-space-md gap-3 bg-secondary-fixed/40 dark:bg-[#3B2312] dark:border dark:border-[#5D361B]" style={shadow('sm')}>
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-1.5">
                <Icon name="restaurant" className="text-[16px] text-secondary" />
                <Text className="font-label-sm text-label-sm text-secondary uppercase tracking-wider font-bold">Tonight&apos;s Zero-Waste Rescue</Text>
              </View>
              <Text className="font-label-sm text-label-sm text-on-surface-variant">{rescue.recipe.minutes} mins</Text>
            </View>
            <View className="flex-row gap-3 items-center">
              <Image source={imageSource(rescue.recipe.image)} style={{ width: 72, height: 72, borderRadius: 12 }} contentFit="cover" />
              <View className="flex-1">
                <Text className="font-headline-sm text-headline-sm text-on-surface">{rescue.recipe.title}</Text>
                <Text numberOfLines={1} className="font-body-sm text-body-sm text-on-surface-variant">
                  Uses: {rescue.rescues.map((entry) => entry.ingredient.name).join(', ')}
                </Text>
              </View>
            </View>
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-1">
                <Icon name="savings" className="text-[16px] text-primary" />
                <Text className="font-label-sm text-label-sm text-primary">Saves {formatMoney(rescue.savesCents)} food waste</Text>
              </View>
              <Pressable onPress={() => router.push(`/recipe/${rescue.recipe.id}`)} className="px-4 h-9 rounded-full bg-primary flex-row items-center gap-1.5">
                <Text className="font-label-md text-label-md text-on-primary">Start Cooking</Text>
                <Icon name="arrow_forward" className="text-[16px] text-on-primary" />
              </Pressable>
            </View>
          </View>
        )}

        {/* Activity log */}
        <View className="gap-space-sm">
          <View className="flex-row items-center justify-between">
            <Text className="font-headline-md text-headline-md text-on-surface">Radar Activity Log</Text>
            <Text className="font-label-sm text-label-sm text-on-surface-variant">Past 48 hours</Text>
          </View>
          {log.length === 0 ? (
            <View className={`rounded-xl p-4 ${tone.card}`} style={shadow('sm')}>
              <Text className="font-body-sm text-body-sm text-on-surface-variant">No activity yet — scan or add groceries and it will show up here.</Text>
            </View>
          ) : (
            log.map((entry) => (
              <View key={entry.id} className={`rounded-xl p-3 flex-row items-start gap-3 ${tone.card}`} style={shadow('sm')}>
                <View className={`w-9 h-9 rounded-full items-center justify-center ${entry.tile}`}>
                  <Icon name={entry.icon} className={`text-[18px] ${entry.color}`} />
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center justify-between gap-2">
                    <Text numberOfLines={1} className="font-label-md text-label-md text-on-surface font-semibold flex-1">{entry.title}</Text>
                    <Text className="font-label-sm text-label-sm text-on-surface-variant">{entry.when}</Text>
                  </View>
                  <Text className="font-body-sm text-body-sm text-on-surface-variant">{entry.detail}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Smart alert schedule */}
        <View className={`rounded-2xl p-space-md gap-4 ${tone.card}`} style={shadow('sm')}>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <Icon name="tune" className="text-[20px] text-primary" />
              <Text className="font-headline-sm text-headline-sm text-on-surface">Smart Alert Schedule</Text>
            </View>
            <Text className="font-label-sm text-label-sm text-primary">Automatic</Text>
          </View>
          <ScheduleRow title="Morning Digest Delivery" detail="Daily briefing time">
            <Pressable
              onPress={() => {
                const index = DIGEST_TIMES.indexOf(settings.digestAt ?? -1);
                setSchedule({ digestAt: index === DIGEST_TIMES.length - 1 ? null : DIGEST_TIMES[index + 1] });
              }}
              className="flex-row items-center gap-1 px-3 py-1.5 rounded-full bg-surface-container-high dark:bg-surface-container-highest">
              <Text className="font-label-md text-label-md text-on-surface">{settings.digestAt === null ? 'Off' : formatClock(settings.digestAt)}</Text>
              <Icon name="expand_more" className="text-[16px] text-on-surface-variant" />
            </Pressable>
          </ScheduleRow>
          <ScheduleRow title="Evening Cook Nudge" detail="5:30 PM when pantry items need dinner prep">
            <Switch label="Evening cook nudge" value={settings.eveningNudge} onValueChange={(eveningNudge) => setSchedule({ eveningNudge })} />
          </ScheduleRow>
          <ScheduleRow title="Expiry Danger Alerts" detail={`${settings.alertDaysBefore * 24} hours before food expires`}>
            <Switch label="Expiry alerts" value={settings.nudgeTypes.expiry} onValueChange={(expiry) => setSchedule({ nudgeTypes: { ...settings.nudgeTypes, expiry } })} />
          </ScheduleRow>
          <ScheduleRow title="Waste Reduction Summary" detail="Weekly Sunday evening report">
            <Switch label="Weekly summary" value={settings.nudgeTypes.weekly} onValueChange={(weekly) => setSchedule({ nudgeTypes: { ...settings.nudgeTypes, weekly } })} />
          </ScheduleRow>
        </View>
      </ScrollView>

      <View className="px-margin pt-2 flex-row items-center gap-3 w-full max-w-[480px] self-center" style={{ paddingBottom: insets.bottom + 12 }}>
        <Pressable onPress={() => router.dismissTo('/recipes')} className="flex-1 h-14 rounded-full bg-primary flex-row items-center justify-center gap-2 active:scale-[0.98]" style={shadow('primaryButton')}>
          <Icon name="calendar_month" className="text-[20px] text-on-primary" />
          <Text className="font-label-lg text-label-lg text-on-primary">Plan Today&apos;s Meals</Text>
        </Pressable>
        <Pressable accessibilityLabel="Alert settings" onPress={() => router.push('/settings/alerts')} className={`w-14 h-14 rounded-full items-center justify-center ${tone.card}`} style={shadow('card')}>
          <Icon name="tune" className="text-[22px] text-on-surface" />
        </Pressable>
      </View>
    </View>
  );
}

function Legend({ dot, label }: { dot: string; label: string }) {
  return (
    <View className="flex-row items-center gap-1.5">
      <View className={`w-2 h-2 rounded-full ${dot}`} />
      <Text className="font-label-sm text-label-sm text-on-surface-variant">{label}</Text>
    </View>
  );
}

function ScheduleRow({ title, detail, children }: { title: string; detail: string; children: React.ReactNode }) {
  return (
    <View className="flex-row items-center justify-between gap-3">
      <View className="flex-1">
        <Text className="font-label-md text-label-md text-on-surface font-semibold">{title}</Text>
        <Text className="font-body-sm text-body-sm text-on-surface-variant">{detail}</Text>
      </View>
      {children}
    </View>
  );
}

function UrgentCard({ item }: { item: PantryItem }) {
  const shadow = useShadow();
  const days = daysLeft(item);
  const food = findFood(item.name);
  const freezerDays = shelfLifeFor(item.category, 'freezer', food).min;
  // Ripe produce on the counter lasts longer in the fridge (avocados, tomatoes, bananas).
  const fridgeLife = item.zone === 'pantry' && food?.shelfLife?.fridge ? food.shelfLife.fridge.min : undefined;
  const extraDays = fridgeLife ? Math.max(0, fridgeLife - Math.max(0, days)) : 0;

  return (
    <View className={`rounded-2xl p-space-md gap-3 ${tone.card}`} style={shadow('card')}>
      <View className="flex-row gap-3">
        <FoodThumb item={item} size={56} />
        <View className="flex-1">
          <View className="flex-row items-start justify-between gap-2">
            <Text className="font-headline-sm text-headline-sm text-on-surface flex-1">{item.name}</Text>
            <View className={`px-2 py-0.5 rounded-full ${tone.urgentBg}`}>
              <Text className={`font-label-sm text-label-sm ${tone.urgentText}`}>{days <= 0 ? 'Eat Today' : shortCountdown(days)}</Text>
            </View>
          </View>
          <View className="flex-row items-center gap-1 mt-0.5">
            <Icon name={zones[item.zone].icon} className="text-[14px] text-on-surface-variant" />
            <Text className="font-body-sm text-body-sm text-on-surface-variant">
              {[item.shelf ?? zones[item.zone].label, item.remainingPct < 100 ? `${item.remainingPct}% left` : `${item.quantity} ${item.unit}`].join(' • ')}
            </Text>
          </View>
        </View>
      </View>
      {fridgeLife && extraDays > 0 ? (
        <>
          <View className={`flex-row items-start gap-2 p-3 rounded-xl ${tone.insetLow}`}>
            <Icon name="tips_and_updates" className="text-[18px] text-secondary" />
            <Text className="font-body-sm text-body-sm text-on-surface-variant flex-1">
              Smart Tip: Move to the fridge now to slow ripening for <Text className="font-body-sm text-body-sm text-primary font-semibold">{extraDays} extra days</Text>.
            </Text>
          </View>
          <Pressable
            onPress={() => updateItem(item.id, { zone: 'fridge', shelf: 'Crisper Drawer', expiresOn: addDays(today(), fridgeLife) })}
            className="self-end flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-high dark:bg-surface-container-highest">
            <Icon name="kitchen" className="text-[16px] text-on-surface" />
            <Text className="font-label-sm text-label-sm text-on-surface">Move to Fridge</Text>
          </Pressable>
        </>
      ) : (
        <View className="flex-row flex-wrap gap-2">
          <Pressable onPress={() => router.push({ pathname: '/recipes', params: { ingredient: item.id } })} className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary">
            <Icon name="skillet" className="text-[16px] text-on-primary" />
            <Text className="font-label-sm text-label-sm text-on-primary">Find Quick Recipe</Text>
          </Pressable>
          {item.zone !== 'freezer' && (
            <Pressable onPress={() => freezeItem(item.id)} className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-high dark:bg-surface-container-highest">
              <Icon name="ac_unit" className="text-[16px] text-on-surface" />
              <Text className="font-label-sm text-label-sm text-on-surface">Freeze (+{freezerDays}d)</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

type LogEntry = { id: string; icon: IconName; tile: string; color: string; title: string; detail: string; when: string; at: string };

function whenLabel(at: string) {
  const date = new Date(at);
  const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return at.slice(0, 10) === new Date().toISOString().slice(0, 10) ? time : `Ytd ${time}`;
}

/** Recent adds, uses, tosses and freezes from the last 48 hours. */
function activityLog(items: PantryItem[], events: ItemEvent[]): LogEntry[] {
  const since = new Date(Date.now() - 48 * 3_600_000).toISOString();
  const entries: LogEntry[] = [];
  const addedToday = items.filter((item) => item.createdAt >= since);
  if (addedToday.length) {
    const latest = addedToday.map((item) => item.createdAt).sort().at(-1)!;
    entries.push({
      id: 'added',
      icon: 'add_task',
      tile: tone.freshBg,
      color: 'text-primary',
      title: `${addedToday.length} ${addedToday.length === 1 ? 'item' : 'items'} added`,
      detail: addedToday.slice(0, 3).map((item) => item.name).join(', ') + (addedToday.length > 3 ? '…' : ''),
      when: whenLabel(latest),
      at: latest,
    });
  }
  for (const event of events) {
    if (event.at < since) break;
    const name = event.itemName.replace(/\s*\(.*\)$/, '');
    if (event.type === 'tossed') {
      entries.push({ id: event.id, icon: 'compost', tile: tone.coralTile, color: 'text-tertiary', title: `${name} tossed`, detail: 'Logged so the radar can nudge earlier next time.', when: whenLabel(event.at), at: event.at });
    } else if (event.type === 'frozen') {
      entries.push({ id: event.id, icon: 'ac_unit', tile: 'bg-surface-container-high dark:bg-surface-container-highest', color: 'text-on-surface', title: `${name} frozen`, detail: 'Shelf life extended in the freezer.', when: whenLabel(event.at), at: event.at });
    } else {
      entries.push({
        id: event.id,
        icon: event.recipeId ? 'skillet' : 'check_circle',
        tile: tone.amberTile,
        color: 'text-secondary',
        title: event.type === 'used' ? `${name} used up` : `Used some ${name.toLowerCase()}`,
        detail: `${formatMoney(event.valueCents)} of food rescued${event.recipeId ? ' while cooking' : ''}.`,
        when: whenLabel(event.at),
        at: event.at,
      });
    }
  }
  return entries.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 5);
}

