import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, Share, TextInput as RNTextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { FoodThumb } from '@/components/food-thumb';
import { Logo } from '@/components/logo';
import { Checkbox } from '@/components/ui/checkbox';
import { Icon } from '@/components/ui/icon';
import { Text, TextInput } from '@/components/ui/text';
import { categories } from '@/domain/categories';
import { findFood } from '@/domain/foods';
import { formatMoney } from '@/domain/format';
import type { CategoryId } from '@/domain/types';
import { useItems } from '@/store/pantry';
import {
  addToRestock,
  clearCart,
  dismissSuggestion,
  finishRun,
  removeRestock,
  restockSuggestions,
  updateRestock,
  useRestock,
  type RestockEntry,
  type RestockSuggestion,
} from '@/store/restock';
import { useShadow } from '@/theme/shadows';
import { tone } from '@/theme/tones';

const STAPLES = ['Sourdough Bread', 'Butter', 'Garlic', 'Eggs', 'Whole Milk', 'Bananas', 'Olive Oil', 'Onions'];

type Row =
  | { kind: 'suggestion'; key: string; suggestion: RestockSuggestion }
  | { kind: 'entry'; key: string; entry: RestockEntry };

export default function RestockScreen() {
  const insets = useSafeAreaInsets();
  const shadow = useShadow();
  const items = useItems();
  const restock = useRestock();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'auto' | CategoryId>('all');
  const [finished, setFinished] = useState<number | undefined>();
  const input = useRef<RNTextInput>(null);

  const suggestions = useMemo(() => restockSuggestions(items, restock), [items, restock]);
  const open = restock.entries.filter((entry) => !entry.inCart);
  const cart = restock.entries.filter((entry) => entry.inCart);

  const rows: Row[] = [
    ...suggestions.map((suggestion) => ({ kind: 'suggestion' as const, key: suggestion.item.id, suggestion })),
    ...open.map((entry) => ({ kind: 'entry' as const, key: entry.id, entry })),
  ];
  const rowCategory = (row: Row) => (row.kind === 'entry' ? row.entry.category : row.suggestion.item.category);
  const rowReason = (row: Row) => (row.kind === 'entry' ? row.entry.reason : row.suggestion.reason);
  const matchesFilter = (row: Row) =>
    filter === 'all' ? true : filter === 'auto' ? rowReason(row) === 'depleted' || rowReason(row) === 'low' : rowCategory(row) === filter;
  const visible = rows.filter(matchesFilter);
  const presentCategories = [...new Set(rows.map(rowCategory))];

  const price = (name: string, cents?: number, quantity = 1) => (cents ?? findFood(name)?.priceCents ?? 0) * quantity;
  const estTotal =
    rows.reduce((sum, row) => sum + (row.kind === 'entry' ? price(row.entry.name, row.entry.priceCents, row.entry.quantity) : price(row.suggestion.item.name, row.suggestion.item.priceCents)), 0) +
    cart.reduce((sum, entry) => sum + price(entry.name, entry.priceCents, entry.quantity), 0);
  const cartTotal = cart.reduce((sum, entry) => sum + price(entry.name, entry.priceCents, entry.quantity), 0);
  const depleted = suggestions.filter((suggestion) => suggestion.reason === 'depleted');
  const low = suggestions.filter((suggestion) => suggestion.reason === 'low');

  const materialize = (suggestion: RestockSuggestion, patch: Partial<RestockEntry> = {}) => {
    const { item } = suggestion;
    const entry = addToRestock({
      name: item.name,
      detail: item.detail,
      category: item.category,
      priceCents: item.priceCents,
      image: item.image,
      reason: suggestion.reason,
      sourceItemId: item.id,
    });
    if (Object.keys(patch).length) updateRestock(entry.id, patch);
  };

  const addTyped = () => {
    const name = query.trim();
    if (!name) return;
    addToRestock({ name, reason: 'manual' });
    setQuery('');
  };

  const shareList = () => {
    const lines = [...rows.map((row) => (row.kind === 'entry' ? `• ${row.entry.quantity > 1 ? `${row.entry.quantity}× ` : ''}${row.entry.name}` : `• ${row.suggestion.item.name}`))];
    Share.share({ message: `Shopping list 🛒\n${lines.join('\n')}\n\nFrom Expiry Radar` }).catch(() => {});
  };

  const sections: { title: string; dot: string; rows: Row[] }[] = [
    { title: 'Urgent Restock (Depleted)', dot: 'bg-tertiary', rows: visible.filter((row) => rowReason(row) === 'depleted') },
    { title: 'Running Low Soon', dot: 'bg-primary', rows: visible.filter((row) => rowReason(row) === 'low') },
    { title: 'On Your List', dot: 'bg-secondary', rows: visible.filter((row) => rowReason(row) === 'manual' || rowReason(row) === 'recipe') },
  ];

  return (
    <View className="flex-1 bg-surface">
      <View className="bg-surface/85 dark:bg-surface/90" style={[{ paddingTop: insets.top }, shadow('header')]}>
        <View className="h-16 px-space-md flex-row items-center justify-between">
          <View className="flex-row items-center gap-space-sm">
            <Pressable accessibilityLabel="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} className="w-11 h-11 -ml-2 rounded-full items-center justify-center">
              <Icon name="arrow_back_ios_new" className="text-[22px] text-on-surface" />
            </Pressable>
            <Logo size={32} />
            <Text className="font-headline-md text-headline-md text-on-surface">Restock</Text>
          </View>
          <Pressable accessibilityLabel="Profile" onPress={() => router.navigate('/profile')}>
            <Avatar size={36} />
          </Pressable>
        </View>
      </View>

      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled" contentContainerClassName="w-full max-w-[480px] self-center px-margin pt-3 gap-space-md" contentContainerStyle={{ paddingBottom: 120 }}>
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-1.5">
            <Icon name="storefront" className="text-[18px] text-primary" />
            <Text className="font-label-md text-label-md text-on-surface uppercase tracking-wide font-semibold">Shopping List</Text>
            <Text className="font-label-sm text-label-sm text-primary">• Synced with pantry</Text>
          </View>
          <View className="flex-row gap-2">
            <Pressable accessibilityLabel="Share list" onPress={shareList} className="w-9 h-9 rounded-full bg-surface-container dark:bg-surface-container-high items-center justify-center">
              <Icon name="ios_share" className="text-[18px] text-on-surface" />
            </Pressable>
          </View>
        </View>

        {/* Search / add */}
        <View className={`flex-row items-center rounded-2xl px-3 h-14 gap-2 ${tone.card}`} style={shadow('sm')}>
          <Icon name="search" className="text-[22px] text-on-surface-variant" />
          <TextInput
            ref={input}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={addTyped}
            returnKeyType="done"
            placeholder="Search or add grocery item..."
            className="flex-1 font-body-md text-body-md text-on-surface h-12"
          />
          {query.trim().length > 0 && (
            <Pressable accessibilityLabel="Add to list" onPress={addTyped} className="w-10 h-10 rounded-full bg-primary items-center justify-center">
              <Icon name="add" className="text-[22px] text-on-primary" />
            </Pressable>
          )}
        </View>

        {finished !== undefined && (
          <View className="rounded-2xl p-4 flex-row items-center gap-3 bg-primary-fixed dark:bg-[#1C382B]">
            <Icon name="task_alt" className="text-[24px] text-primary" />
            <Text className="font-body-md text-body-md text-on-primary-fixed dark:text-on-surface flex-1">
              {finished} {finished === 1 ? 'item' : 'items'} added to your pantry with smart expiry dates.
            </Text>
            <Pressable onPress={() => router.dismissTo('/inventory')}>
              <Text className="font-label-md text-label-md text-primary font-bold">View</Text>
            </Pressable>
          </View>
        )}

        {/* Auto-restock alert */}
        {suggestions.length > 0 && (
          <View className="rounded-2xl p-4 flex-row gap-3 bg-secondary-fixed/50 dark:bg-[#3B2312] dark:border dark:border-[#5D361B]" style={shadow('sm')}>
            <View className="w-11 h-11 rounded-xl bg-secondary-container dark:bg-secondary items-center justify-center">
              <Icon name="soup_kitchen" className="text-[22px] text-on-secondary-container dark:text-on-secondary" />
            </View>
            <View className="flex-1 gap-1">
              <Text className="font-label-sm text-label-sm text-secondary uppercase tracking-wider font-bold">Auto-Restock Alert</Text>
              <Text className="font-label-lg text-label-lg text-on-surface">
                {depleted.length ? `${depleted[0].item.name.replace(/\s*\(.*\)$/, '')} ${depleted[0].note.toLowerCase()}` : `${low.length} ${low.length === 1 ? 'item is' : 'items are'} running low`}
              </Text>
              <Text className="font-body-sm text-body-sm text-on-surface-variant">The radar noticed these from your pantry — tick what you need.</Text>
              <View className="flex-row gap-2 mt-1">
                {depleted.length > 0 && (
                  <View className={`flex-row items-center gap-1 px-2 py-0.5 rounded-full ${tone.soonBg}`}>
                    <View className="w-1.5 h-1.5 rounded-full bg-secondary" />
                    <Text className={`font-label-sm text-label-sm ${tone.soonText}`}>{depleted.length} Depleted</Text>
                  </View>
                )}
                {low.length > 0 && (
                  <View className="flex-row items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container-high dark:bg-surface-container-highest">
                    <View className="w-1.5 h-1.5 rounded-full bg-outline" />
                    <Text className="font-label-sm text-label-sm text-on-surface-variant">{low.length} Low</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Filters */}
        {rows.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-margin" contentContainerClassName="px-margin gap-2">
            <Chip label={`All (${rows.length})`} active={filter === 'all'} onPress={() => setFilter('all')} />
            {suggestions.length > 0 && <Chip label={`⚡ Auto-Restock (${suggestions.length})`} active={filter === 'auto'} onPress={() => setFilter('auto')} />}
            {presentCategories.map((category) => (
              <Chip
                key={category}
                label={`${categories[category].emoji} ${categories[category].label} (${rows.filter((row) => rowCategory(row) === category).length})`}
                active={filter === category}
                onPress={() => setFilter(category)}
              />
            ))}
          </ScrollView>
        )}

        {rows.length + cart.length > 0 && (
          <View className={`flex-row items-center justify-between px-4 py-2.5 rounded-xl ${tone.insetLow}`}>
            <View className="flex-row items-center gap-1.5">
              <Icon name="route" className="text-[18px] text-primary" />
              <Text className="font-label-md text-label-md text-on-surface-variant">Grouped by urgency</Text>
            </View>
            <Text className="font-label-md text-label-md text-on-surface-variant">
              Est. Total: <Text className="font-headline-sm text-headline-sm text-on-surface">~{formatMoney(estTotal)}</Text>
            </Text>
          </View>
        )}

        {rows.length + cart.length === 0 && (
          <View className="items-center py-12 px-6 gap-2">
            <View className="w-16 h-16 rounded-full bg-primary-fixed dark:bg-[#1C382B] items-center justify-center mb-2">
              <Icon name="shopping_cart" className="text-[30px] text-primary" />
            </View>
            <Text className="font-headline-md text-headline-md text-on-surface">Your list is clear</Text>
            <Text className="font-body-md text-body-md text-on-surface-variant text-center">
              When you use something up, the radar suggests it here. Add anything else with the search bar.
            </Text>
          </View>
        )}

        {sections.map((section) =>
          section.rows.length === 0 ? null : (
            <View key={section.title} className="gap-3">
              <View className="flex-row items-center justify-between px-1">
                <View className="flex-row items-center gap-2">
                  <View className={`w-2 h-2 rounded-full ${section.dot}`} />
                  <Text className="font-label-lg text-label-lg text-on-surface font-bold">{section.title}</Text>
                </View>
                <Text className="font-label-sm text-label-sm text-on-surface-variant">
                  {section.rows.length} {section.rows.length === 1 ? 'item' : 'items'}
                </Text>
              </View>
              {section.rows.map((row) =>
                row.kind === 'suggestion' ? (
                  <ListRow
                    key={row.key}
                    name={row.suggestion.item.name}
                    image={row.suggestion.item.image}
                    category={row.suggestion.item.category}
                    detail={row.suggestion.item.detail ?? categories[row.suggestion.item.category].label}
                    badge={row.suggestion.reason === 'depleted' ? 'EMPTY' : row.suggestion.item.remainingPct <= 30 ? `${row.suggestion.item.remainingPct}% LEFT` : undefined}
                    priceCents={price(row.suggestion.item.name, row.suggestion.item.priceCents)}
                    note={row.suggestion.note}
                    noteUrgent={row.suggestion.reason === 'low'}
                    quantity={1}
                    onQuantity={(quantity) => materialize(row.suggestion, { quantity })}
                    onCheck={() => materialize(row.suggestion, { inCart: true })}
                    onRemove={() => dismissSuggestion(row.suggestion.item.id)}
                  />
                ) : (
                  <ListRow
                    key={row.key}
                    name={row.entry.name}
                    image={row.entry.image}
                    category={row.entry.category}
                    detail={row.entry.detail ?? categories[row.entry.category].label}
                    priceCents={price(row.entry.name, row.entry.priceCents, row.entry.quantity)}
                    note={row.entry.reason === 'recipe' ? 'For a recipe' : row.entry.reason === 'manual' ? 'Added by you' : undefined}
                    quantity={row.entry.quantity}
                    onQuantity={(quantity) => updateRestock(row.entry.id, { quantity })}
                    onCheck={() => updateRestock(row.entry.id, { inCart: true })}
                    onRemove={() => removeRestock(row.entry.id)}
                  />
                )
              )}
            </View>
          )
        )}

        {/* In cart */}
        {cart.length > 0 && (
          <View className="gap-3">
            <View className="flex-row items-center justify-between px-1">
              <View className="flex-row items-center gap-2">
                <Icon name="shopping_bag" className="text-[18px] text-on-surface" />
                <Text className="font-label-lg text-label-lg text-on-surface font-bold">In Cart ({cart.length})</Text>
              </View>
              <Pressable onPress={clearCart}>
                <Text className="font-label-md text-label-md text-primary">Clear Done</Text>
              </Pressable>
            </View>
            {cart.map((entry) => (
              <View key={entry.id} className="flex-row items-center gap-3 p-4 rounded-2xl bg-surface-container-low dark:bg-surface-container opacity-70">
                <Checkbox label={`Remove ${entry.name} from cart`} checked onChange={() => updateRestock(entry.id, { inCart: false })} />
                <FoodThumb item={{ name: entry.name, image: entry.image, category: entry.category }} size={44} />
                <View className="flex-1">
                  <Text numberOfLines={1} className="font-label-lg text-label-lg text-on-surface-variant line-through">{entry.name}</Text>
                  <Text className="font-body-sm text-body-sm text-on-surface-variant">
                    {entry.quantity > 1 ? `${entry.quantity}× • ` : ''}Added to cart
                  </Text>
                </View>
                <Text className="font-label-md text-label-md text-on-surface-variant">~{formatMoney(price(entry.name, entry.priceCents, entry.quantity))}</Text>
              </View>
            ))}
            <View className="rounded-2xl p-4 flex-row items-center gap-3 bg-primary-fixed/40 dark:bg-[#1C382B] dark:border dark:border-[#2B5440]">
              <View className="w-11 h-11 rounded-full bg-primary items-center justify-center">
                <Icon name="inventory" className="text-[22px] text-on-primary" />
              </View>
              <View className="flex-1">
                <Text className="font-label-lg text-label-lg text-primary">Auto-Add to Radar Pantry</Text>
                <Text className="font-body-sm text-body-sm text-on-surface-variant">Bought items get smart expiry dates</Text>
              </View>
              <Pressable onPress={() => setFinished(finishRun())} className="px-4 h-11 rounded-full bg-primary items-center justify-center">
                <Text className="font-label-md text-label-md text-on-primary font-bold">Finish Run</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Quick add */}
        <View className="gap-2">
          <Text className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">+ Quick add frequent staples</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-margin" contentContainerClassName="px-margin gap-2">
            {STAPLES.filter((name) => !restock.entries.some((entry) => entry.name === name)).map((name) => (
              <Pressable key={name} onPress={() => addToRestock({ name, reason: 'manual' })} className={`flex-row items-center gap-1.5 px-3.5 py-2 rounded-full ${tone.card}`} style={shadow('sm')}>
                <Icon name="add" className="text-[16px] text-primary" />
                <Text className="font-label-md text-label-md text-on-surface">{name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </ScrollView>

      {/* Bottom bar */}
      <View className="absolute left-0 right-0 bottom-0 px-margin" style={{ paddingBottom: insets.bottom + 12 }}>
        <View className="w-full max-w-[480px] self-center flex-row items-center justify-between rounded-full bg-inverse-surface dark:bg-surface-container-highest pl-4 pr-1.5 py-1.5" style={shadow('sheet')}>
          <View className="flex-row items-center gap-3">
            <View className="w-10 h-10 rounded-full bg-primary items-center justify-center">
              <Icon name="shopping_cart" className="text-[20px] text-on-primary" />
            </View>
            <View>
              <Text className="font-label-md text-label-md text-inverse-on-surface dark:text-on-surface">
                {cart.length} of {cart.length + rows.length} in Cart
              </Text>
              <Text className="font-body-sm text-body-sm text-inverse-on-surface/70 dark:text-on-surface-variant">~{formatMoney(Math.max(0, estTotal - cartTotal))} remaining</Text>
            </View>
          </View>
          <Pressable onPress={() => input.current?.focus()} className="flex-row items-center gap-1.5 px-5 h-12 rounded-full bg-primary">
            <Icon name="add" className="text-[20px] text-on-primary" />
            <Text className="font-label-lg text-label-lg text-on-primary">Add Item</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className={`px-4 py-2 rounded-full ${active ? 'bg-primary' : tone.card}`}>
      <Text className={`font-label-md text-label-md ${active ? 'text-on-primary font-semibold' : 'text-on-surface'}`}>{label}</Text>
    </Pressable>
  );
}

function ListRow({
  name,
  image,
  category,
  detail,
  badge,
  priceCents,
  note,
  noteUrgent,
  quantity,
  onQuantity,
  onCheck,
  onRemove,
}: {
  name: string;
  image?: string;
  category: CategoryId;
  detail: string;
  badge?: string;
  priceCents: number;
  note?: string;
  noteUrgent?: boolean;
  quantity: number;
  onQuantity: (quantity: number) => void;
  onCheck: () => void;
  onRemove: () => void;
}) {
  const shadow = useShadow();
  return (
    <View className={`flex-row items-center gap-3 p-4 rounded-2xl ${tone.card}`} style={shadow('card')}>
      <Checkbox label={`Add ${name} to cart`} checked={false} onChange={onCheck} />
      <FoodThumb item={{ name, image, category }} size={52} />
      <View className="flex-1 min-w-0">
        <View className="flex-row items-center gap-1.5">
          <Text numberOfLines={1} className="font-label-lg text-label-lg text-on-surface flex-shrink">{name}</Text>
          {badge && (
            <View className={`px-1.5 rounded ${badge === 'EMPTY' ? tone.urgentBg : tone.soonBg}`}>
              <Text className={`font-label-sm text-[10px] font-bold ${badge === 'EMPTY' ? tone.urgentText : tone.soonText}`}>{badge}</Text>
            </View>
          )}
        </View>
        <Text numberOfLines={1} className="font-body-sm text-body-sm text-on-surface-variant">{detail}</Text>
        <View className="flex-row items-center gap-2">
          <Text className="font-label-sm text-label-sm text-secondary">~{formatMoney(priceCents)}</Text>
          {note && <Text className={`font-label-sm text-label-sm ${noteUrgent ? 'text-tertiary' : 'text-on-surface-variant'}`}>{note}</Text>}
        </View>
      </View>
      <View className="items-end gap-1">
        <View className="flex-row items-center rounded-full bg-surface-container-low dark:bg-surface-container-high">
          <Pressable accessibilityLabel="Less" onPress={() => (quantity > 1 ? onQuantity(quantity - 1) : onRemove())} className="w-8 h-8 items-center justify-center">
            <Text className="font-label-lg text-label-lg text-on-surface">{quantity > 1 ? '−' : '×'}</Text>
          </Pressable>
          <Text className="font-label-md text-label-md text-on-surface w-4 text-center">{quantity}</Text>
          <Pressable accessibilityLabel="More" onPress={() => onQuantity(quantity + 1)} className="w-8 h-8 items-center justify-center">
            <Text className="font-label-lg text-label-lg text-on-surface">+</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
