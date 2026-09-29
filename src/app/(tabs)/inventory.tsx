import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { FoodThumb } from '@/components/food-thumb';
import { ToastBanner } from '@/components/toast-banner';
import { Icon } from '@/components/ui/icon';
import { Text, TextInput } from '@/components/ui/text';
import { UrgencyPill } from '@/components/urgency';
import { getRecipe } from '@/data/recipes';
import { zones } from '@/domain/categories';
import { today } from '@/domain/dates';
import { daysLeft, expiryBadge, needsAttention, urgencyFor } from '@/domain/expiry';
import type { PantryItem, Urgency, Zone } from '@/domain/types';
import { markUsed, restoreItem, undoLastCook, useActiveItems } from '@/store/pantry';
import { useShadow } from '@/theme/shadows';
import { useTheme } from '@/theme/theme-provider';
import { tone } from '@/theme/tones';

type Filter = 'all' | Zone | 'expiring';
type Sort = 'expiry' | 'name' | 'recent';

const SORTS: Record<Sort, string> = {
  expiry: 'Expiration Date (Soonest)',
  name: 'Name (A–Z)',
  recent: 'Recently Added',
};
const SORT_ORDER: Sort[] = ['expiry', 'name', 'recent'];

/** Inventory pills use the *-variant text shades in the light export. */
const PILL_TEXT: Record<Urgency, string> = {
  expired: 'text-on-error-container dark:text-tertiary',
  urgent: 'text-on-error-container dark:text-tertiary',
  soon: 'text-on-secondary-fixed-variant dark:text-secondary',
  fresh: 'text-on-primary-fixed-variant dark:text-primary',
};

type Toast =
  | { kind: 'used'; item: PantryItem }
  | { kind: 'cooked'; recipeTitle: string; count: number; grams: number };

export default function InventoryScreen() {
  const shadow = useShadow();
  const params = useLocalSearchParams<{ filter?: Filter; cooked?: string; count?: string; grams?: string; at?: string }>();
  const items = useActiveItems();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>(params.filter ?? 'all');
  const [sort, setSort] = useState<Sort>('expiry');
  const [grid, setGrid] = useState(false);
  const [toast, setToast] = useState<Toast | undefined>();

  // Navigation params (filter link, "just cooked" banner) are applied once per arrival.
  const [seenFilter, setSeenFilter] = useState(params.filter);
  if (params.filter !== seenFilter) {
    setSeenFilter(params.filter);
    if (params.filter) setFilter(params.filter);
  }
  const [seenCook, setSeenCook] = useState<string | undefined>();
  if (params.cooked && params.at !== seenCook) {
    setSeenCook(params.at);
    const recipe = getRecipe(params.cooked);
    if (recipe) {
      setToast({ kind: 'cooked', recipeTitle: recipe.title, count: Number(params.count ?? 0), grams: Number(params.grams ?? 0) });
    }
  }

  const now = today();
  const attention = items.filter((item) => needsAttention(item, now));
  const counts = {
    all: items.length,
    fridge: items.filter((item) => item.zone === 'fridge').length,
    pantry: items.filter((item) => item.zone === 'pantry').length,
    freezer: items.filter((item) => item.zone === 'freezer').length,
    expiring: attention.length,
  };

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = items.filter((item) => {
      if (filter === 'expiring' && !needsAttention(item, now)) return false;
      if (filter !== 'all' && filter !== 'expiring' && item.zone !== filter) return false;
      return !q || `${item.name} ${item.detail ?? ''}`.toLowerCase().includes(q);
    });
    if (sort === 'name') return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
    if (sort === 'recent') return [...filtered].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return filtered;
  }, [items, filter, query, sort, now]);

  const handleUsed = (item: PantryItem) => {
    markUsed(item.id);
    setToast({ kind: 'used', item });
  };

  return (
    <View className="flex-1 bg-surface">
      <AppHeader page="Inventory" />
      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="w-full max-w-[480px] self-center px-margin pt-1 pb-8 gap-space-md">
        {toast?.kind === 'cooked' && (
          <ToastBanner
            icon="skillet"
            title="Pantry updated!"
            body={
              <>
                {toast.count} {toast.count === 1 ? 'ingredient' : 'ingredients'} auto-adjusted after cooking{' '}
                <Text className="font-label-md text-label-md text-on-primary-fixed-variant dark:text-on-surface-variant">
                  {toast.recipeTitle}
                </Text>
                .
              </>
            }
            footnote={toast.grams > 0 ? `Saved ~${toast.grams}g food waste` : undefined}
            onUndo={
              toast.count > 0
                ? () => {
                    undoLastCook();
                    setToast(undefined);
                  }
                : undefined
            }
            onDismiss={() => setToast(undefined)}
          />
        )}
        {toast?.kind === 'used' && (
          <ToastBanner
            icon="check_circle"
            title="Nice save!"
            body={`${toast.item.name} marked as used. That's one less thing in the bin.`}
            onUndo={() => {
              restoreItem(toast.item.id, toast.item);
              setToast(undefined);
            }}
            onDismiss={() => setToast(undefined)}
          />
        )}

        {/* Search & Action Bar */}
        <View className={`relative flex-row items-center w-full rounded-full p-1.5 ${tone.card}`} style={shadow('sm')}>
          <View className="items-center justify-center pl-3">
            <Icon name="search" className="text-[22px] text-on-surface-variant" />
          </View>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search milk, greens, pantry..."
            returnKeyType="search"
            className="flex-1 bg-transparent px-space-sm h-9 font-body-md text-body-md text-on-surface"
          />
          <View className="flex-row items-center gap-1 pr-1">
            {query.length > 0 && (
              <Pressable accessibilityLabel="Clear search" onPress={() => setQuery('')} className="w-9 h-9 rounded-full items-center justify-center active:scale-95">
                <Icon name="close" className="text-[20px] text-on-surface-variant" />
              </Pressable>
            )}
            <Pressable
              accessibilityLabel="Barcode scanner"
              onPress={() => router.push({ pathname: '/scan', params: { mode: 'barcode' } })}
              className="w-9 h-9 rounded-full bg-surface-container dark:bg-surface-container-high items-center justify-center active:scale-95">
              <Icon name="qr_code_scanner" className="text-[20px] text-primary" />
            </Pressable>
          </View>
        </View>

        {/* Filter Chips Row */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-margin" contentContainerClassName="px-margin pb-1 gap-2">
          <FilterChip label="All" count={counts.all} active={filter === 'all'} onPress={() => setFilter('all')} />
          <FilterChip label="Fridge" count={counts.fridge} active={filter === 'fridge'} onPress={() => setFilter('fridge')} />
          <FilterChip label="Pantry" count={counts.pantry} active={filter === 'pantry'} onPress={() => setFilter('pantry')} />
          <FilterChip label="Freezer" count={counts.freezer} active={filter === 'freezer'} onPress={() => setFilter('freezer')} />
          <FilterChip label="Expiring Soon" count={counts.expiring} active={filter === 'expiring'} onPress={() => setFilter('expiring')} expiring />
        </ScrollView>

        {/* Sort and View Header */}
        <View className="flex-row items-center justify-between pt-1">
          <Pressable
            onPress={() => setSort(SORT_ORDER[(SORT_ORDER.indexOf(sort) + 1) % SORT_ORDER.length])}
            className="flex-row items-center gap-1.5 bg-surface-container-low dark:bg-surface-container dark:border dark:border-outline-variant/50 px-3 py-1.5 rounded-full active:scale-95">
            <Icon name="swap_vert" className="text-[16px] text-primary" />
            <Text className="font-label-sm text-label-sm text-on-surface">
              Sort by: <Text className="font-label-sm text-label-sm font-semibold text-primary">{SORTS[sort]}</Text>
            </Text>
            <Icon name="expand_more" className="text-[16px] text-outline" />
          </Pressable>
          <View className="flex-row items-center bg-surface-container-low dark:bg-surface-container p-1 rounded-full">
            <Pressable
              accessibilityLabel="List layout"
              onPress={() => setGrid(false)}
              className={`w-7 h-7 rounded-full items-center justify-center ${!grid ? 'bg-surface-container-lowest dark:bg-surface-container-highest' : ''}`}
              style={!grid ? shadow('sm') : undefined}>
              <Icon name="view_list" className={`text-[18px] ${!grid ? 'text-primary' : 'text-outline'}`} />
            </Pressable>
            <Pressable
              accessibilityLabel="Grid layout"
              onPress={() => setGrid(true)}
              className={`w-7 h-7 rounded-full items-center justify-center ${grid ? 'bg-surface-container-lowest dark:bg-surface-container-highest' : ''}`}
              style={grid ? shadow('sm') : undefined}>
              <Icon name="grid_view" className={`text-[18px] ${grid ? 'text-primary' : 'text-outline'}`} />
            </Pressable>
          </View>
        </View>

        {/* Radar Attention Banner */}
        {attention.length > 0 && filter !== 'expiring' && (
          <AttentionBanner count={attention.length} onPress={() => setFilter('expiring')} />
        )}

        {/* Item Cards */}
        {visible.length === 0 ? (
          <View className="flex-col items-center justify-center py-12 px-4">
            <View className="w-16 h-16 rounded-full bg-primary-fixed dark:bg-[#1C382B] items-center justify-center mb-3">
              <Icon name="check" className="text-[32px] text-primary" />
            </View>
            <Text className="font-headline-md text-headline-md text-on-surface font-semibold">Clean Countertop!</Text>
            <Text className="font-body-md text-body-md text-on-surface-variant max-w-[260px] mt-1 text-center">
              {items.length === 0
                ? 'Scan a receipt or add your first item and the radar will start watching.'
                : 'Nothing left in this view. Keep cooking fresh and waste-free!'}
            </Text>
          </View>
        ) : grid ? (
          <View className="flex-row flex-wrap gap-3">
            {visible.map((item) => (
              <GridCard key={item.id} item={item} />
            ))}
          </View>
        ) : (
          <View className="flex-col gap-3">
            {visible.map((item) => (
              <ItemCard key={item.id} item={item} onUsed={() => handleUsed(item)} />
            ))}
          </View>
        )}

        {/* Manual Add Action Callout */}
        <View className="pt-2">
          <Pressable
            onPress={() => router.push('/add-item')}
            className="w-full flex-row items-center justify-center gap-2 py-3.5 px-4 rounded-full bg-surface-container dark:bg-surface-container-high active:scale-[0.98]"
            style={shadow('sm')}>
            <Icon name="add_circle" className="text-[20px] text-primary" />
            <Text className="font-label-lg text-label-lg text-on-surface">+ Add Item Manually</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function FilterChip({
  label,
  count,
  active,
  onPress,
  expiring,
}: {
  label: string;
  count: number;
  active: boolean;
  onPress: () => void;
  expiring?: boolean;
}) {
  const shadow = useShadow();
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center gap-1.5 px-3.5 py-1.5 rounded-full active:scale-95 ${
        active ? 'bg-primary' : `${tone.card}`
      }`}
      style={shadow('sm')}>
      {expiring && <Icon name="hourglass_top" className={`text-[15px] ${active ? 'text-on-primary' : 'text-tertiary'}`} />}
      <Text
        className={`font-label-md text-label-md ${
          active ? 'text-on-primary' : expiring ? 'text-secondary' : 'text-on-surface-variant'
        }`}>
        {label}
      </Text>
      <View
        className={`px-1.5 rounded-full ${
          active ? 'bg-on-primary/20' : expiring ? tone.coralTile : 'bg-surface-container-highest'
        }`}>
        <Text
          className={`text-[10px] font-semibold ${
            active ? 'text-on-primary' : expiring ? 'text-on-tertiary-fixed-variant dark:text-tertiary' : 'text-on-surface'
          }`}>
          {count}
        </Text>
      </View>
    </Pressable>
  );
}

function AttentionBanner({ count, onPress }: { count: number; onPress: () => void }) {
  const shadow = useShadow();
  const { scheme, colors } = useTheme();
  const gradient =
    scheme === 'dark'
      ? (['#3A1813', colors['surface-container'], colors['surface-container']] as const)
      : ([colors['tertiary-fixed'], colors['surface-container-low']] as const);
  return (
    <Pressable onPress={onPress} className="rounded-2xl overflow-hidden dark:border dark:border-outline-variant/60" style={shadow('sm')}>
      <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ padding: 16 }}>
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-3 flex-1">
            <View className="w-10 h-10 rounded-full bg-tertiary/10 dark:bg-tertiary/15 items-center justify-center shrink-0">
              <Icon name="crisis_alert" className="text-[24px] text-tertiary" />
            </View>
            <View className="flex-1">
              <Text className="font-label-lg text-label-lg text-on-surface font-bold">
                {count} {count === 1 ? 'item needs' : 'items need'} attention
              </Text>
              <Text className="font-body-sm text-body-sm text-on-surface-variant">
                Use them in the next 72 hours to prevent waste
              </Text>
            </View>
          </View>
          <Icon name="chevron_right" className="text-[20px] text-outline" />
        </View>
      </LinearGradient>
    </Pressable>
  );
}

function subtitle(item: PantryItem) {
  return [item.detail, zones[item.zone].label].filter(Boolean).join(' • ');
}

function ItemCard({ item, onUsed }: { item: PantryItem; onUsed: () => void }) {
  const shadow = useShadow();
  const days = daysLeft(item);
  const urgency = urgencyFor(days);
  const critical = urgency === 'urgent' || urgency === 'expired';

  if (critical) {
    return (
      <Pressable onPress={() => router.push(`/item/${item.id}`)} className={`flex-col p-4 rounded-2xl ${tone.card}`} style={shadow('sm')}>
        <View className="flex-row items-center gap-3">
          <FoodThumb item={item} size={56} />
          <View className="flex-col flex-1 min-w-0">
            <View className="flex-row items-center justify-between gap-1">
              <Text numberOfLines={1} className="font-headline-sm text-headline-sm text-on-surface flex-shrink">
                {item.name}
              </Text>
              <UrgencyPill urgency={urgency} label={expiryBadge(days)} dot className="px-2.5" textClassName={PILL_TEXT[urgency]} />
            </View>
            <Text className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">{subtitle(item)}</Text>
          </View>
        </View>
        {/* Quick Actions Drawer */}
        <View className="flex-row items-center justify-end gap-2 mt-3 pt-3 dark:border-t dark:border-outline-variant/40">
          <Pressable
            onPress={() => router.navigate('/recipes')}
            className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-low dark:bg-surface-container-high active:scale-95">
            <Icon name="restaurant_menu" className="text-[16px] text-tertiary" />
            <Text className="font-label-md text-label-md text-on-surface-variant dark:text-on-surface">Find Recipe</Text>
          </Pressable>
          <Pressable onPress={onUsed} className="flex-row items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-primary active:scale-95" style={shadow('sm')}>
            <Icon name="check_circle" className="text-[16px] text-on-primary" />
            <Text className="font-label-md text-label-md text-on-primary dark:font-semibold">Mark Used</Text>
          </Pressable>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={() => router.push(`/item/${item.id}`)}
      className={`flex-row items-center p-4 rounded-2xl justify-between ${tone.card}`}
      style={shadow('sm')}>
      <View className="flex-row items-center gap-3 min-w-0 flex-1">
        <FoodThumb item={item} size={56} />
        <View className="flex-col min-w-0 flex-1">
          <Text numberOfLines={1} className="font-headline-sm text-headline-sm text-on-surface">
            {item.name}
          </Text>
          <Text className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">{subtitle(item)}</Text>
        </View>
      </View>
      <View className="flex-col items-end gap-2 shrink-0 ml-2">
        <UrgencyPill urgency={urgency} label={expiryBadge(days)} className="px-2.5" textClassName={PILL_TEXT[urgency]} />
        <Pressable accessibilityLabel={`Mark ${item.name} used`} onPress={onUsed} hitSlop={10} className="active:scale-95">
          <Icon name="check_circle" className="text-[20px] text-outline" />
        </Pressable>
      </View>
    </Pressable>
  );
}

function GridCard({ item }: { item: PantryItem }) {
  const shadow = useShadow();
  const days = daysLeft(item);
  const urgency = urgencyFor(days);
  return (
    <Pressable
      onPress={() => router.push(`/item/${item.id}`)}
      className={`p-3 rounded-2xl gap-2 ${tone.card}`}
      style={[{ width: '48%' }, shadow('sm')]}>
      <FoodThumb item={item} size={140} radius={12} className="w-full" />
      <Text numberOfLines={1} className="font-label-lg text-label-lg text-on-surface">
        {item.name}
      </Text>
      <UrgencyPill urgency={urgency} label={expiryBadge(days)} className="px-2.5 self-start" textClassName={PILL_TEXT[urgency]} />
    </Pressable>
  );
}
