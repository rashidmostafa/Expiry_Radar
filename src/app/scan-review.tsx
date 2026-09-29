import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { BottomNav } from '@/components/bottom-nav';
import { DateSheet } from '@/components/date-sheet';
import { FoodThumb } from '@/components/food-thumb';
import { Checkbox } from '@/components/ui/checkbox';
import { Icon } from '@/components/ui/icon';
import { Sheet, SheetOption } from '@/components/ui/sheet';
import { Text, TextInput } from '@/components/ui/text';
import { imageSource } from '@/data/images';
import { categories, zoneOrder, zones } from '@/domain/categories';
import { addDays, daysBetween, formatLong, formatShort, today } from '@/domain/dates';
import { urgencyFor } from '@/domain/expiry';
import { findFood, shelfLifeFor } from '@/domain/foods';
import type { Zone } from '@/domain/types';
import { addItems, draftFromName } from '@/store/pantry';
import { clearSession, removeEntry, updateEntry, useScanSession, type ScanEntry } from '@/store/scan-session';
import { useShadow } from '@/theme/shadows';
import { tone } from '@/theme/tones';

export default function ScanReviewScreen() {
  const shadow = useShadow();
  const session = useScanSession();
  const [menuFor, setMenuFor] = useState<ScanEntry | undefined>();
  const [dateFor, setDateFor] = useState<ScanEntry | undefined>();
  const [zoneFor, setZoneFor] = useState<ScanEntry | undefined>();
  const [renameFor, setRenameFor] = useState<ScanEntry | undefined>();
  const [newName, setNewName] = useState('');

  const entries = session.entries;
  const food = entries.filter((entry) => !entry.excluded);
  const selected = food.filter((entry) => entry.selected && !entry.unknown);
  const recognized = entries.filter((entry) => !entry.unknown && !entry.excluded).length;
  const allSelected = food.length > 0 && food.every((entry) => entry.selected);

  const add = () => {
    addItems(selected.map((entry) => entry.draft));
    clearSession();
    router.dismissTo('/inventory');
  };

  const rename = () => {
    if (!renameFor || !newName.trim()) return;
    const { draft } = renameFor;
    updateEntry(renameFor.key, {
      unknown: false,
      selected: true,
      draft: draftFromName(newName.trim(), {
        barcode: draft.barcode,
        source: draft.source,
        purchasedOn: draft.purchasedOn,
        priceCents: draft.priceCents,
        quantity: draft.quantity,
        detail: draft.detail,
      }),
    });
    setRenameFor(undefined);
  };

  if (entries.length === 0) {
    return (
      <View className="flex-1 bg-surface">
        <AppHeader page="Inventory" />
        <View className="flex-1 items-center justify-center px-8 gap-3">
          <Icon name="barcode_scanner" className="text-[40px] text-outline" />
          <Text className="font-headline-sm text-headline-sm text-on-surface">Nothing to review</Text>
          <Pressable onPress={() => router.replace('/scan')} className="px-5 h-11 rounded-full bg-primary items-center justify-center">
            <Text className="font-label-lg text-label-lg text-on-primary">Start scanning</Text>
          </Pressable>
        </View>
        <BottomNav active="inventory" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-surface">
      <AppHeader page="Inventory" />
      <ScrollView className="flex-1" contentContainerClassName="w-full max-w-[480px] self-center px-margin pt-1 pb-6 gap-4">
        <View className="flex-row items-center justify-between pt-1">
          <View className="flex-row items-center gap-space-sm flex-1">
            <Pressable
              accessibilityLabel="Back to scanner"
              onPress={() => router.replace('/scan')}
              className="w-10 h-10 rounded-full bg-surface-container-low dark:bg-surface-container items-center justify-center active:scale-95"
              style={shadow('sm')}>
              <Icon name="arrow_back" className="text-[20px] text-on-surface" />
            </Pressable>
            <View className="flex-1">
              <Text className="font-headline-sm text-headline-sm text-on-surface tracking-tight leading-tight">Review Scanned Items</Text>
              <View className="flex-row items-center gap-1.5 mt-0.5">
                <View className="w-2 h-2 rounded-full bg-primary" />
                <Text className="font-label-sm text-label-sm text-on-surface-variant font-normal">
                  {session.source === 'receipt' ? 'Receipt processed' : 'Barcode batch'} •{' '}
                  <Text className="font-label-sm text-label-sm font-semibold text-primary">
                    {entries.length} {entries.length === 1 ? 'item' : 'items'} found
                  </Text>
                </Text>
              </View>
            </View>
          </View>
          <View className="flex-row items-center gap-1 bg-primary-fixed/40 dark:bg-[#1C382B] px-2.5 py-1 rounded-full">
            <Icon name="check_circle" className="text-[15px] text-on-primary-fixed-variant dark:text-primary" />
            <Text className="font-label-sm text-label-sm font-semibold text-on-primary-fixed-variant dark:text-primary">
              {recognized}/{entries.length} Matched
            </Text>
          </View>
        </View>

        {/* Source card */}
        <View className={`rounded-xl p-space-md flex-row items-center justify-between ${tone.card}`} style={shadow('statCard')}>
          <View className="flex-row items-center gap-space-md flex-1">
            <View className="w-12 h-14 rounded-lg bg-surface-container overflow-hidden relative">
              {session.source === 'receipt' && <Image source={imageSource('receipt')} style={{ width: '100%', height: '100%' }} contentFit="cover" />}
              <View className="absolute inset-0 bg-primary/10 items-center justify-center">
                <Icon name={session.source === 'receipt' ? 'receipt_long' : 'barcode_scanner'} className="text-[18px] text-primary" />
              </View>
            </View>
            <View className="min-w-0 flex-1">
              <View className="flex-row items-center gap-1.5">
                <Text numberOfLines={1} className="font-label-lg text-label-lg text-on-surface font-semibold flex-shrink">
                  {session.store ?? (session.source === 'receipt' ? 'Grocery receipt' : 'Barcode scan')}
                </Text>
                <Icon name="verified" className="text-[16px] text-primary" />
              </View>
              <Text numberOfLines={1} className="font-body-sm text-body-sm text-on-surface-variant">
                {formatLong(session.date ?? today())}
              </Text>
              <View className="flex-row items-center gap-0.5 mt-0.5">
                <Icon name="document_scanner" className="text-[13px] text-primary" />
                <Text className="font-label-sm text-label-sm text-primary font-medium">{entries.length} items detected</Text>
              </View>
            </View>
          </View>
          <Pressable
            onPress={() => router.replace('/scan')}
            className="px-3 py-1.5 rounded-full bg-surface-container dark:bg-surface-container-high flex-row items-center gap-1">
            <Icon name="add" className="text-[16px] text-on-surface-variant" />
            <Text className="font-label-md text-label-md text-on-surface-variant">Scan more</Text>
          </Pressable>
        </View>

        <View className="flex-row items-center justify-between px-1">
          <Pressable
            onPress={() => food.forEach((entry) => updateEntry(entry.key, { selected: !allSelected }))}
            className="flex-row items-center gap-2.5">
            <Checkbox label="Select all" checked={allSelected} />
            <Text className="font-label-lg text-label-lg text-on-surface font-medium">
              {selected.length} of {entries.length} selected to add
            </Text>
          </Pressable>
          <View className="flex-row items-center gap-1">
            <Text className="font-label-sm text-label-sm text-on-surface-variant">Tap to adjust details</Text>
            <Icon name="tune" className="text-[14px] text-on-surface-variant" />
          </View>
        </View>

        <View className="gap-3">
          {entries.map((entry) =>
            entry.excluded ? (
              <ExcludedCard key={entry.key} entry={entry} />
            ) : (
              <EntryCard
                key={entry.key}
                entry={entry}
                onMenu={() => setMenuFor(entry)}
                onDate={() => setDateFor(entry)}
                onZone={() => setZoneFor(entry)}
                onRename={() => {
                  setNewName(entry.unknown ? '' : entry.draft.name);
                  setRenameFor(entry);
                }}
              />
            )
          )}
        </View>

        <View className="pt-2">
          <View className={`rounded-2xl p-4 gap-2.5 ${tone.card}`} style={shadow('sheet')}>
            <View className="flex-row items-center justify-between px-1">
              <View className="flex-row items-center gap-1.5">
                <Icon name="eco" className="text-[16px] text-primary" />
                <Text className="font-label-sm text-label-sm text-on-surface-variant">Smart shelf-life applied</Text>
              </View>
              <Text className="font-label-sm text-label-sm text-primary font-semibold">
                {selected.filter((entry) => findFood(entry.draft.name)).length}/{selected.length} known foods
              </Text>
            </View>
            <Pressable
              disabled={selected.length === 0}
              onPress={add}
              className={`w-full h-12 rounded-full bg-primary flex-row items-center justify-center gap-2 active:scale-[0.98] ${selected.length === 0 ? 'opacity-50' : ''}`}
              style={shadow('primaryButton')}>
              <Icon name="add_task" className="text-[20px] text-on-primary" />
              <Text className="font-label-lg text-label-lg font-bold text-on-primary">
                Add {selected.length} {selected.length === 1 ? 'Item' : 'Items'} to Pantry
              </Text>
            </Pressable>
            <Pressable
              onPress={() => router.push('/add-item')}
              className="w-full h-11 rounded-full bg-surface-container-low dark:bg-surface-container-high flex-row items-center justify-center gap-1.5 active:scale-[0.98]">
              <Icon name="add_circle" className="text-[18px] text-primary" />
              <Text className="font-label-md text-label-md font-semibold text-on-surface">+ Add Missing Item</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
      <BottomNav active="inventory" />

      <Sheet visible={!!menuFor} onClose={() => setMenuFor(undefined)} title={menuFor?.draft.name ?? ''}>
        <SheetOption icon="edit" label="Rename" onPress={() => { const entry = menuFor!; setMenuFor(undefined); setNewName(entry.unknown ? '' : entry.draft.name); setRenameFor(entry); }} />
        <SheetOption icon="edit_calendar" label="Change expiry date" onPress={() => { setDateFor(menuFor); setMenuFor(undefined); }} />
        <SheetOption icon="kitchen" label="Change storage zone" onPress={() => { setZoneFor(menuFor); setMenuFor(undefined); }} />
        <SheetOption icon="delete" label="Remove from this scan" destructive onPress={() => { removeEntry(menuFor!.key); setMenuFor(undefined); }} />
      </Sheet>

      <Sheet visible={!!zoneFor} onClose={() => setZoneFor(undefined)} title="Where will it live?">
        {zoneOrder.map((zone: Zone) => (
          <SheetOption
            key={zone}
            icon={zones[zone].icon}
            label={zones[zone].label}
            selected={zoneFor?.draft.zone === zone}
            onPress={() => {
              const { draft } = zoneFor!;
              const life = shelfLifeFor(draft.category, zone, findFood(draft.name));
              updateEntry(zoneFor!.key, { draft: { zone, expiresOn: addDays(draft.purchasedOn, life.min) } });
              setZoneFor(undefined);
            }}
          />
        ))}
      </Sheet>

      <Sheet visible={!!renameFor} onClose={() => setRenameFor(undefined)} title={renameFor?.unknown ? 'What is this item?' : 'Rename item'} subtitle={renameFor?.draft.barcode ? `Barcode ${renameFor.draft.barcode}` : undefined}>
        <TextInput
          value={newName}
          onChangeText={setNewName}
          autoFocus
          onSubmitEditing={rename}
          placeholder="e.g., Greek Yogurt"
          className="h-12 px-4 rounded-xl bg-surface-container-low dark:bg-surface-container font-body-md text-body-md text-on-surface"
        />
        <Pressable onPress={rename} className="mt-2 h-12 rounded-xl bg-primary items-center justify-center">
          <Text className="font-label-lg text-label-lg text-on-primary">Save</Text>
        </Pressable>
      </Sheet>

      {dateFor && (
        <DateSheet
          visible
          title={`${dateFor.draft.name} expires`}
          value={session.entries.find((entry) => entry.key === dateFor.key)?.draft.expiresOn ?? dateFor.draft.expiresOn}
          onChange={(expiresOn) => updateEntry(dateFor.key, { draft: { expiresOn } })}
          onClose={() => setDateFor(undefined)}
        />
      )}
    </View>
  );
}

function EntryCard({
  entry,
  onMenu,
  onDate,
  onZone,
  onRename,
}: {
  entry: ScanEntry;
  onMenu: () => void;
  onDate: () => void;
  onZone: () => void;
  onRename: () => void;
}) {
  const shadow = useShadow();
  const { draft } = entry;
  const days = daysBetween(today(), draft.expiresOn);
  const urgency = urgencyFor(days);
  const fresh = urgency === 'fresh';
  const span = days >= 60 ? `${Math.round(days / 30)} mos` : `${days} ${days === 1 ? 'day' : 'days'}`;

  return (
    <View className={`rounded-xl p-space-md ${tone.card} ${entry.selected ? '' : 'opacity-75'}`} style={shadow('card')}>
      <View className="flex-row items-start gap-space-sm">
        <View className="mt-1">
          <Checkbox
            label={`Add ${draft.name}`}
            checked={entry.selected && !entry.unknown}
            onChange={(selected) => (entry.unknown ? onRename() : updateEntry(entry.key, { selected }))}
          />
        </View>
        <FoodThumb item={draft} size={48} className="bg-surface-container-low" />
        <View className="flex-1 min-w-0">
          <View className="flex-row items-start justify-between gap-1">
            <Pressable onPress={onRename} className="flex-1">
              <Text numberOfLines={1} className={`font-label-lg text-label-lg font-bold ${entry.unknown ? 'text-secondary' : 'text-on-surface'}`}>
                {entry.unknown ? 'Unknown item — tap to name' : draft.name}
              </Text>
              <Text numberOfLines={1} className="font-label-sm text-label-sm text-on-surface-variant">
                {categories[draft.category].label} • {draft.detail ?? `${draft.quantity} ${draft.unit}`}
              </Text>
            </Pressable>
            <Pressable accessibilityLabel="Item options" onPress={onMenu} hitSlop={8} className="p-1 rounded-full">
              <Icon name="more_vert" className="text-[18px] text-on-surface-variant" />
            </Pressable>
          </View>
          <View className="mt-2.5 flex-row flex-wrap items-center gap-2">
            <Pressable
              onPress={onDate}
              className={`flex-row items-center gap-1.5 px-2.5 py-1 rounded-full ${
                fresh ? 'bg-primary-fixed/40 dark:bg-[#1C382B]' : urgency === 'soon' ? 'bg-secondary-container/20 dark:bg-[#3B2312]' : 'bg-error-container/60 dark:bg-[#3A1813]'
              }`}>
              <Icon name={fresh ? 'schedule' : 'alarm'} className={`text-[14px] ${fresh ? 'text-primary' : urgency === 'soon' ? 'text-secondary' : 'text-tertiary'}`} />
              <Text className={`font-label-sm text-label-sm font-semibold ${fresh ? 'text-on-primary-fixed-variant dark:text-primary' : 'text-on-secondary-container dark:text-secondary'}`}>
                {formatShort(draft.expiresOn)}
              </Text>
              <Text className={`font-label-sm text-label-sm ${fresh ? 'text-primary' : urgency === 'soon' ? 'text-secondary' : 'text-tertiary'}`}>({span})</Text>
              <Icon name="edit_calendar" className="text-[13px] text-on-surface-variant" />
            </Pressable>
            <Pressable onPress={onZone} className="flex-row items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container dark:bg-surface-container-high">
              <Icon name={zones[draft.zone].icon} className="text-[14px] text-primary" />
              <Text className="font-label-sm text-label-sm text-on-surface-variant">{zones[draft.zone].label}</Text>
              <Icon name="expand_more" className="text-[12px] text-on-surface-variant" />
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

function ExcludedCard({ entry }: { entry: ScanEntry }) {
  return (
    <View className="bg-surface-container-low/70 dark:bg-surface-container-low rounded-xl p-space-md opacity-75">
      <View className="flex-row items-start gap-space-sm">
        <View className="mt-1">
          <Checkbox
            label={`Track ${entry.draft.name} anyway`}
            checked={false}
            onChange={() => updateEntry(entry.key, { excluded: false, selected: true })}
          />
        </View>
        <View className="w-12 h-12 rounded-xl bg-surface-container-high items-center justify-center">
          <Icon name="inventory_2" className="text-[24px] text-on-surface-variant" />
        </View>
        <View className="flex-1 min-w-0">
          <View className="flex-row items-start justify-between gap-1">
            <View className="flex-1">
              <Text numberOfLines={1} className="font-label-lg text-label-lg text-on-surface-variant font-semibold line-through">
                {entry.draft.name}
              </Text>
              <View className="flex-row items-center gap-1 mt-0.5">
                <Icon name="scan" className="text-[14px] text-outline" />
                <Text className="font-label-sm text-label-sm text-outline font-medium">Non-food detected</Text>
              </View>
            </View>
            <View className="px-2 py-0.5 rounded-full bg-surface-container-highest">
              <Text className="font-label-sm text-label-sm text-on-surface-variant">Excluded</Text>
            </View>
          </View>
          <Text className="font-body-sm text-body-sm text-on-surface-variant mt-1">Smart filter excluded this item from food tracking.</Text>
        </View>
      </View>
    </View>
  );
}
