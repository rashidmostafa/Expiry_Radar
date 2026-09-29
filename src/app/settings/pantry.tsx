import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, ScrollView, Share, View } from 'react-native';

import { SettingsHeader } from '@/components/settings-header';
import { Icon, type IconName } from '@/components/ui/icon';
import { Sheet, SheetOption } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { DIETS, SIZES } from '@/data/household';
import { imageSource } from '@/data/images';
import { categories, zones } from '@/domain/categories';
import type { CategoryId, ItemEvent, PantryItem, Zone } from '@/domain/types';
import { clearOldHistory, useEvents, useItems, wipeAllData } from '@/store/pantry';
import { resetCursors } from '@/services/sync';
import { useAccount } from '@/store/account';
import { seedDemoKitchen } from '@/store/seed';
import { updateSettings, useSettings, type DietId, type ThemePreference } from '@/store/settings';
import { useShadow } from '@/theme/shadows';
import { tone } from '@/theme/tones';

const RULE_CATEGORIES: { id: CategoryId; icon: IconName }[] = [
  { id: 'produce', icon: 'nutrition' },
  { id: 'dairy', icon: 'egg' },
  { id: 'proteins', icon: 'set_meal' },
  { id: 'bakery', icon: 'bakery_dining' },
  { id: 'pantry', icon: 'shelves' },
  { id: 'beverages', icon: 'local_drink' },
];

const ZONE_ORDER: Zone[] = ['fridge', 'freezer', 'pantry'];

const THEMES: { value: ThemePreference; label: string; icon: IconName }[] = [
  { value: 'light', label: 'Light', icon: 'light_mode' },
  { value: 'dark', label: 'Dark', icon: 'dark_mode' },
  { value: 'system', label: 'System', icon: 'brightness_auto' },
];

function csvCell(value: string | number | undefined) {
  const text = value === undefined ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Ledger export in the same shape as the Stitch sample spoilage log. */
function ledgerCsv(items: PantryItem[], events: ItemEvent[]) {
  const header = ['date', 'item_name', 'category', 'action', 'fraction', 'value_usd', 'weight_g', 'days_left', 'recipe'];
  const rows = events.map((event) => [
    event.at.slice(0, 10),
    event.itemName,
    event.category ?? '',
    event.type,
    event.fraction.toFixed(2),
    (event.valueCents / 100).toFixed(2),
    event.grams,
    event.daysLeft ?? '',
    event.recipeId ?? '',
  ]);
  const active = items
    .filter((item) => item.status === 'active')
    .map((item) => [item.purchasedOn, item.name, item.category, `in_${item.zone}`, (item.remainingPct / 100).toFixed(2), '', '', '', `expires ${item.expiresOn}`]);
  return [header, ...rows, ...active].map((row) => row.map(csvCell).join(',')).join('\n');
}

export default function PantrySettingsScreen() {
  const shadow = useShadow();
  const settings = useSettings();
  const items = useItems();
  const events = useEvents();
  const [confirm, setConfirm] = useState<'wipe' | 'history' | 'sample' | undefined>();
  const [notice, setNotice] = useState<string | undefined>();
  const { household } = useAccount();

  const setRule = (category: CategoryId, zone: Zone) => {
    const next = { ...settings.zoneDefaults };
    if (zone === categories[category].zone) delete next[category];
    else next[category] = zone;
    updateSettings({ zoneDefaults: next });
  };

  const toggleDiet = (value: DietId | 'none') => {
    if (value === 'none') return updateSettings({ diets: [] });
    const diets = settings.diets.includes(value) ? settings.diets.filter((entry) => entry !== value) : [...settings.diets, value];
    updateSettings({ diets });
  };

  const exportLedger = () => {
    Share.share({ title: 'Expiry Radar ledger', message: ledgerCsv(items, events) }).catch(() => setNotice('Sharing is not available here.'));
  };

  return (
    <View className="flex-1 bg-surface">
      <SettingsHeader title="Pantry Settings" />
      <ScrollView className="flex-1" contentContainerClassName="w-full max-w-[480px] self-center px-margin pt-3 pb-10 gap-space-lg">
        <View className="flex-row items-center gap-4 p-4 rounded-2xl overflow-hidden bg-surface-container-high/70 dark:bg-surface-container">
          <View className="flex-1 gap-1">
            <View className="flex-row items-center gap-1.5">
              <Icon name="shelves" className="text-[16px] text-primary" />
              <Text className="font-label-sm text-label-sm text-primary uppercase tracking-wider font-bold">Kitchen Organization</Text>
            </View>
            <Text className="font-headline-md text-headline-md text-on-surface">Automation & Storage</Text>
            <Text className="font-body-sm text-body-sm text-on-surface-variant">Fine-tune where new items land and how the radar fits your household.</Text>
          </View>
          <Image source={imageSource('pantry-shelf')} style={{ width: 64, height: 64, borderRadius: 12 }} contentFit="cover" />
        </View>

        {notice && (
          <View className="rounded-xl bg-on-surface px-space-md py-2 flex-row items-center justify-between">
            <Text className="font-label-sm text-label-sm text-inverse-on-surface flex-1">{notice}</Text>
            <Pressable accessibilityLabel="Dismiss" onPress={() => setNotice(undefined)}>
              <Icon name="close" className="text-[16px] text-inverse-on-surface" />
            </Pressable>
          </View>
        )}

        {/* Auto-zone rules */}
        <View className="gap-space-sm">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <Icon name="auto_fix_high" className="text-[22px] text-primary" />
              <Text className="font-headline-md text-headline-md text-on-surface">Auto-Zone Rules</Text>
            </View>
            <View className={`px-2 py-0.5 rounded-full ${tone.freshBg}`}>
              <Text className={`font-label-sm text-label-sm ${tone.freshText}`}>Smart Routing</Text>
            </View>
          </View>
          <View className={`rounded-2xl p-4 gap-4 ${tone.card}`} style={shadow('sm')}>
            <View className={`flex-row items-start gap-2 p-3 rounded-xl ${tone.insetLow}`}>
              <Icon name="info" className="text-[16px] text-on-surface-variant" />
              <Text className="font-body-sm text-body-sm text-on-surface-variant flex-1">
                New items land in these zones unless you pick one yourself. Specific foods (like avocados on the counter) keep their smart default.
              </Text>
            </View>
            {RULE_CATEGORIES.map(({ id, icon }) => {
              const zone = settings.zoneDefaults[id] ?? categories[id].zone;
              const custom = !!settings.zoneDefaults[id];
              return (
                <View key={id} className="gap-2">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2">
                      <Icon name={icon} className="text-[20px] text-on-surface" />
                      <Text className="font-label-lg text-label-lg text-on-surface">{categories[id].label}</Text>
                    </View>
                    <Text className={`font-label-sm text-label-sm ${custom ? 'text-primary' : 'text-on-surface-variant'}`}>{custom ? 'Custom' : `Default: ${zones[zone].label}`}</Text>
                  </View>
                  <View className="flex-row gap-1 p-1 rounded-full bg-surface-container-low dark:bg-surface-container-high">
                    {ZONE_ORDER.map((option) => {
                      const selected = option === zone;
                      return (
                        <Pressable
                          key={option}
                          onPress={() => setRule(id, option)}
                          className={`flex-1 flex-row items-center justify-center gap-1 py-1.5 rounded-full ${selected ? 'bg-surface-container-lowest dark:bg-surface-container-highest' : ''}`}
                          style={selected ? shadow('sm') : undefined}>
                          <Icon name={zones[option].icon} className={`text-[14px] ${selected ? 'text-primary' : 'text-on-surface-variant'}`} />
                          <Text className={`font-label-sm text-label-sm ${selected ? 'text-primary font-semibold' : 'text-on-surface-variant'}`}>{zones[option].label}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Household */}
        <View className="gap-space-sm">
          <Text className="font-headline-md text-headline-md text-on-surface">Household & Diet</Text>
          <View className={`rounded-2xl p-4 gap-4 ${tone.card}`} style={shadow('sm')}>
            <View className="gap-2">
              <Text className="font-label-md text-label-md text-on-surface-variant">Household size (default recipe portions)</Text>
              <View className="flex-row gap-2">
                {SIZES.map((option) => {
                  const selected = settings.householdSize === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => updateSettings({ householdSize: option.value })}
                      className={`flex-1 items-center py-2 rounded-xl ${selected ? 'bg-primary' : 'bg-surface-container-low dark:bg-surface-container-high'}`}>
                      <Icon name={option.icon} className={`text-[18px] ${selected ? 'text-on-primary' : 'text-on-surface-variant'}`} />
                      <Text className={`font-label-sm text-label-sm ${selected ? 'text-on-primary' : 'text-on-surface'}`}>{option.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <View className="gap-2">
              <Text className="font-label-md text-label-md text-on-surface-variant">Diet — recipes are filtered to match</Text>
              <View className="flex-row flex-wrap gap-2">
                {DIETS.map((option) => {
                  const selected = option.value === 'none' ? settings.diets.length === 0 : settings.diets.includes(option.value);
                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => toggleDiet(option.value)}
                      className={`flex-row items-center gap-1.5 h-9 px-3 rounded-full ${selected ? 'bg-primary-fixed dark:bg-[#1C382B]' : 'bg-surface-container-low dark:bg-surface-container-high'}`}>
                      <Icon name={option.icon} className={`text-[16px] ${selected ? 'text-primary' : 'text-on-surface-variant'}`} />
                      <Text className={`font-label-md text-label-md ${selected ? 'text-on-primary-fixed dark:text-primary' : 'text-on-surface'}`}>{option.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
        </View>

        {/* General & units */}
        <View className="gap-space-sm">
          <Text className="font-headline-md text-headline-md text-on-surface">General & Units</Text>
          <View className={`rounded-2xl p-4 gap-4 ${tone.card}`} style={shadow('sm')}>
            <View className="gap-2">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  <Icon name="straighten" className="text-[20px] text-on-surface" />
                  <Text className="font-label-lg text-label-lg text-on-surface">Measurement Standard</Text>
                </View>
                <Text className="font-label-sm text-label-sm text-primary">Active: {settings.units === 'imperial' ? 'oz / °F' : 'g / °C'}</Text>
              </View>
              <View className="flex-row gap-1 p-1 rounded-full bg-surface-container-low dark:bg-surface-container-high">
                {(
                  [
                    ['imperial', 'Imperial (oz, lbs, °F)'],
                    ['metric', 'Metric (g, kg, °C)'],
                  ] as const
                ).map(([value, label]) => {
                  const selected = settings.units === value;
                  return (
                    <Pressable
                      key={value}
                      onPress={() => updateSettings({ units: value })}
                      className={`flex-1 flex-row items-center justify-center gap-1 py-2 rounded-full ${selected ? 'bg-surface-container-lowest dark:bg-surface-container-highest' : ''}`}
                      style={selected ? shadow('sm') : undefined}>
                      {selected && <Icon name="check_circle" className="text-[16px] text-primary" />}
                      <Text className={`font-label-md text-label-md ${selected ? 'text-on-surface' : 'text-on-surface-variant'}`}>{label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <View className="gap-2">
              <View className="flex-row items-center gap-2">
                <Icon name="palette" className="text-[20px] text-on-surface" />
                <Text className="font-label-lg text-label-lg text-on-surface">App Display Theme</Text>
              </View>
              <View className="flex-row gap-2">
                {THEMES.map((theme) => {
                  const selected = settings.theme === theme.value;
                  return (
                    <Pressable
                      key={theme.value}
                      onPress={() => updateSettings({ theme: theme.value })}
                      className={`flex-1 items-center gap-1 py-3 rounded-xl ${selected ? 'bg-primary-fixed dark:bg-[#1C382B] dark:border dark:border-[#2B5440]' : 'bg-surface-container-low dark:bg-surface-container-high'}`}>
                      <View className="flex-row items-center gap-1">
                        <Icon name={theme.icon} className={`text-[20px] ${selected ? 'text-primary' : 'text-on-surface-variant'}`} />
                        {selected && <Icon name="check" className="text-[16px] text-primary" />}
                      </View>
                      <Text className={`font-label-md text-label-md ${selected ? 'text-primary' : 'text-on-surface'}`}>{theme.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
        </View>

        {/* Data */}
        <View className="gap-space-sm">
          <Text className="font-headline-md text-headline-md text-on-surface">Data & Household Ledger</Text>
          <View className={`rounded-2xl overflow-hidden ${tone.card}`} style={shadow('sm')}>
            <DataRow icon="download" title="Export Pantry Ledger" detail={`CSV of ${events.length} ledger entries and your current pantry`} onPress={exportLedger} />
            <DataRow icon="history" title="Clear Expired History" detail="Remove finished items older than 90 days" onPress={() => setConfirm('history')} />
            <DataRow icon="science" title="Load Sample Kitchen" detail="Explore the app with the demo pantry and history" onPress={() => setConfirm('sample')} />
            <View className="p-4 gap-3 bg-error-container/30 dark:bg-[#3A1813]">
              <View className="flex-row items-start gap-3">
                <View className="w-10 h-10 rounded-xl bg-error-container dark:bg-[#5A251E] items-center justify-center">
                  <Icon name="warning" className="text-[20px] text-error dark:text-tertiary" />
                </View>
                <View className="flex-1">
                  <Text className="font-label-lg text-label-lg text-error dark:text-tertiary">Wipe Pantry Data</Text>
                  <Text className="font-body-sm text-body-sm text-on-surface-variant">Permanently removes every item, the ledger and scheduled alerts from this device.</Text>
                </View>
              </View>
              <Pressable onPress={() => setConfirm('wipe')} className="self-end flex-row items-center gap-1.5 px-4 h-10 rounded-full bg-error dark:bg-tertiary">
                <Icon name="delete_forever" className="text-[18px] text-on-error dark:text-on-tertiary" />
                <Text className="font-label-md text-label-md text-on-error dark:text-on-tertiary">Wipe Pantry Data</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>

      <Sheet visible={confirm === 'wipe'} onClose={() => setConfirm(undefined)} title="Wipe everything?" subtitle="Items, history and alerts on this device will be deleted. This can't be undone.">
        <SheetOption icon="delete_forever" label="Yes, wipe pantry data" destructive onPress={() => { wipeAllData(); resetCursors(); setConfirm(undefined); setNotice(household ? 'This phone was cleared. Shared household items sync back on the next sync.' : 'All pantry data removed.'); }} />
        <SheetOption icon="close" label="Keep my data" onPress={() => setConfirm(undefined)} />
      </Sheet>
      <Sheet visible={confirm === 'history'} onClose={() => setConfirm(undefined)} title="Clear old history?" subtitle="Finished items older than 90 days are removed. Your savings totals are kept.">
        <SheetOption icon="history" label="Clear history" onPress={() => { const removed = clearOldHistory(); setConfirm(undefined); setNotice(`${removed} old ${removed === 1 ? 'item' : 'items'} cleared.`); }} />
        <SheetOption icon="close" label="Cancel" onPress={() => setConfirm(undefined)} />
      </Sheet>
      <Sheet visible={confirm === 'sample'} onClose={() => setConfirm(undefined)} title="Load the sample kitchen?" subtitle="Adds the demo pantry and a few months of history alongside your own items.">
        <SheetOption icon="science" label="Load sample kitchen" onPress={() => { seedDemoKitchen(true); setConfirm(undefined); setNotice('Sample kitchen loaded.'); }} />
        <SheetOption icon="close" label="Cancel" onPress={() => setConfirm(undefined)} />
      </Sheet>
    </View>
  );
}

function DataRow({ icon, title, detail, onPress }: { icon: IconName; title: string; detail: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="flex-row items-center gap-3 p-4 border-b border-surface-container-low dark:border-outline-variant/40 active:bg-surface-container-low">
      <View className="w-10 h-10 rounded-xl bg-surface-container-low dark:bg-surface-container-high items-center justify-center">
        <Icon name={icon} className="text-[20px] text-on-surface" />
      </View>
      <View className="flex-1">
        <Text className="font-label-lg text-label-lg text-on-surface">{title}</Text>
        <Text className="font-body-sm text-body-sm text-on-surface-variant">{detail}</Text>
      </View>
      <Icon name="chevron_right" className="text-[20px] text-on-surface-variant" />
    </Pressable>
  );
}
