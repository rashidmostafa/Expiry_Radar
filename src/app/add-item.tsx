import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FlowHeader } from '@/components/app-header';
import { DateSheet } from '@/components/date-sheet';
import { Icon } from '@/components/ui/icon';
import { Switch } from '@/components/ui/switch';
import { Text, TextInput } from '@/components/ui/text';
import { imageSource } from '@/data/images';
import { categories, categoryOrder, zoneClimate, zoneOrder, zones } from '@/domain/categories';
import { addDays, daysBetween, formatLong, formatRelativeDay, today } from '@/domain/dates';
import { findFood, shelfLifeFor } from '@/domain/foods';
import type { CategoryId, NewPantryItem, PantryItem, Zone } from '@/domain/types';
import { pickPhoto } from '@/services/photos';
import { addItems, getItem, updateItem } from '@/store/pantry';
import { useSettings } from '@/store/settings';
import { useShadow } from '@/theme/shadows';
import { tone } from '@/theme/tones';

const UNITS = [
  ['pack', 'Packs'],
  ['units', 'Units'],
  ['oz', 'oz'],
  ['lbs', 'lbs'],
] as const;

type Form = {
  name: string;
  detail: string;
  category: CategoryId | undefined;
  zone: Zone | undefined;
  quantity: number;
  unit: string;
  purchasedOn: string;
  expiresOn: string | undefined;
  image: string | undefined;
  alertEnabled: boolean;
};

function emptyForm(name = '', detail = ''): Form {
  return {
    name,
    detail,
    category: undefined,
    zone: undefined,
    quantity: 1,
    unit: 'pack',
    purchasedOn: today(),
    expiresOn: undefined,
    image: undefined,
    alertEnabled: true,
  };
}

function formFromItem(item: PantryItem): Form {
  return {
    name: item.name,
    detail: item.detail ?? '',
    category: item.category,
    zone: item.zone,
    quantity: item.quantity,
    unit: item.unit,
    purchasedOn: item.purchasedOn,
    expiresOn: item.expiresOn,
    image: item.image,
    alertEnabled: item.alertEnabled,
  };
}

export default function AddItemScreen() {
  const params = useLocalSearchParams<{ id?: string; name?: string; detail?: string; barcode?: string }>();
  const editing = params.id ? getItem(params.id) : undefined;
  const insets = useSafeAreaInsets();
  const shadow = useShadow();
  const { alertDaysBefore, zoneDefaults } = useSettings();

  const [form, setForm] = useState<Form>(() => (editing ? formFromItem(editing) : emptyForm(params.name, params.detail)));
  const [dateSheet, setDateSheet] = useState<'purchased' | 'expires' | undefined>();
  const [showErrors, setShowErrors] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  // "Auto-detect": until the user chooses, the name drives category, zone and shelf life.
  const food = findFood(form.name);
  const category = form.category ?? food?.category;
  const recommendedZone = (category && zoneDefaults[category]) ?? food?.zone ?? (category ? categories[category].zone : 'fridge');
  const zone = form.zone ?? recommendedZone;
  const life = shelfLifeFor(category ?? 'other', zone, food);
  const suggestedExpiry = addDays(form.purchasedOn, life.min);
  const bufferExpiry = addDays(form.purchasedOn, life.max);
  const expiresOn = form.expiresOn ?? suggestedExpiry;
  const photo = imageSource(form.image ?? food?.image);

  const set = (patch: Partial<Form>) => setForm((current) => ({ ...current, ...patch }));

  const draft = (): NewPantryItem | undefined => {
    if (!form.name.trim() || !category) {
      setShowErrors(true);
      return undefined;
    }
    return {
      name: form.name.trim(),
      detail: form.detail.trim() || undefined,
      category,
      zone,
      shelf: editing && editing.zone === zone ? editing.shelf : food?.shelf,
      quantity: form.quantity,
      unit: form.unit,
      remainingPct: editing?.remainingPct ?? 100,
      purchasedOn: form.purchasedOn,
      expiresOn,
      openedOn: editing?.openedOn,
      priceCents: editing?.priceCents,
      image: form.image ?? food?.image,
      barcode: editing?.barcode ?? params.barcode,
      source: editing?.source ?? (params.barcode ? 'barcode' : 'manual'),
      notes: editing?.notes,
      alertEnabled: form.alertEnabled,
    };
  };

  const save = (another: boolean) => {
    const item = draft();
    if (!item) return;
    if (editing) {
      updateItem(editing.id, item);
      router.back();
      return;
    }
    addItems([item]);
    if (another) {
      setForm({ ...emptyForm(), zone: form.zone, purchasedOn: form.purchasedOn });
      setShowErrors(false);
      setSavedCount((count) => count + 1);
    } else {
      router.back();
    }
  };

  const attachPhoto = async (from: 'camera' | 'library') => {
    const uri = await pickPhoto(from);
    if (uri) set({ image: uri });
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-surface">
      <FlowHeader title={editing ? 'Edit Item' : 'Add Item'} />
      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="w-full max-w-[480px] self-center px-margin pt-4 gap-space-lg"
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
        {/* Subtle Top Sub-bar with Reset */}
        <View className="flex-row items-center justify-between px-space-xs -mt-2">
          <View className="flex-row items-center gap-space-xs">
            <Icon name="eco" className="text-[16px] text-primary" />
            <Text className="font-label-md text-label-md text-primary">
              {savedCount > 0 ? `${savedCount} saved this session` : 'Pantry Log Mode'}
            </Text>
          </View>
          <Pressable
            onPress={() => {
              setForm(editing ? formFromItem(editing) : emptyForm());
              setShowErrors(false);
            }}
            className="px-2 py-1 rounded-full active:bg-surface-container">
            <Text className="font-label-md text-label-md text-on-surface-variant">Reset Form</Text>
          </Pressable>
        </View>

        {/* 1. Optional Photo Upload Card */}
        <View className={`w-full rounded-2xl p-space-lg items-center justify-center overflow-hidden ${tone.card}`} style={shadow('sm')}>
          {photo ? (
            <Image source={photo} style={{ width: 96, height: 96, borderRadius: 48, marginBottom: 8 }} contentFit="cover" />
          ) : (
            <View className="w-16 h-16 rounded-full bg-primary-fixed/40 dark:bg-[#1C382B] items-center justify-center mb-space-sm">
              <Icon name="add_a_photo" className="text-[30px] text-primary" />
            </View>
          )}
          <Text className="font-headline-sm text-headline-sm text-on-surface">
            {photo ? 'Photo Added ' : 'Add Photo '}
            <Text className="font-body-sm text-body-sm text-on-surface-variant font-normal">(Optional)</Text>
          </Text>
          <Text className="font-body-sm text-body-sm text-on-surface-variant mt-1 max-w-[260px] text-center">
            Snap packaging, nutrition tag, or receipt barcode
          </Text>
          <View className="flex-row items-center gap-space-sm mt-space-md">
            <PhotoChip icon="camera_alt" label="Camera" onPress={() => attachPhoto('camera')} />
            <PhotoChip icon="photo_library" label="Gallery" onPress={() => attachPhoto('library')} />
          </View>
        </View>

        {/* 2. Item Details Input */}
        <View className={`w-full rounded-2xl p-space-md gap-space-md ${tone.card}`} style={shadow('sm')}>
          <View>
            <View className="flex-row items-center justify-between mb-1.5">
              <Text className="font-label-lg text-label-lg text-on-surface">
                Item Name <Text className="font-label-lg text-label-lg text-error">*</Text>
              </Text>
              <Text className="font-label-sm text-label-sm text-primary font-semibold">
                {food ? `Detected: ${categories[food.category].label}` : 'Auto-detect ready'}
              </Text>
            </View>
            <TextInput
              value={form.name}
              onChangeText={(name) => set({ name })}
              placeholder="e.g., Honeycrisp Apples or Greek Yogurt"
              autoFocus={!editing && !params.name}
              className={`w-full h-12 px-4 rounded-xl bg-surface-container-low dark:bg-surface-container font-body-md text-body-md text-on-surface ${
                showErrors && !form.name.trim() ? 'border border-error' : ''
              }`}
            />
          </View>
          <View>
            <Text className="font-label-sm text-label-sm text-on-surface-variant mb-1.5">Brand / Size (Optional)</Text>
            <TextInput
              value={form.detail}
              onChangeText={(detail) => set({ detail })}
              placeholder="e.g., Chobani • 32 oz or 4 pack"
              className="w-full h-11 px-4 rounded-xl bg-surface-container-low dark:bg-surface-container font-body-md text-body-md text-on-surface"
            />
          </View>
        </View>

        {/* 3. Category Selector */}
        <View className={`w-full rounded-2xl p-space-md gap-space-sm ${tone.card}`} style={shadow('sm')}>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <Text className="font-label-lg text-label-lg text-on-surface">Category</Text>
              <View className={`px-2 py-0.5 rounded-full ${tone.urgentBg}`}>
                <Text className={`font-label-sm text-label-sm ${tone.urgentText}`}>Required</Text>
              </View>
            </View>
            <Text className={`font-label-sm text-label-sm ${showErrors && !category ? 'text-error' : 'text-on-surface-variant'}`}>
              {showErrors && !category ? 'Pick one to continue' : 'Tap to swap'}
            </Text>
          </View>
          <View className="flex-row flex-wrap gap-2 pt-1">
            {categoryOrder.map((id) => (
              <CategoryChip
                key={id}
                emoji={categories[id].emoji}
                label={categories[id].label}
                active={category === id}
                onPress={() => set({ category: id, expiresOn: undefined })}
              />
            ))}
            {category === 'other' ? (
              <CategoryChip emoji={categories.other.emoji} label={categories.other.label} active onPress={() => {}} />
            ) : (
              <Pressable
                onPress={() => set({ category: 'other', expiresOn: undefined })}
                className="h-9 px-3 rounded-full bg-surface-container-high dark:bg-surface-container-highest flex-row items-center gap-1">
                <Icon name="add" className="text-[16px] text-primary" />
                <Text className="font-label-md text-label-md text-primary">Custom</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* 4. Quantity & Unit Stepper */}
        <View className={`w-full rounded-2xl p-space-md gap-space-md ${tone.card}`} style={shadow('sm')}>
          <View className="flex-row items-center justify-between">
            <Text className="font-label-lg text-label-lg text-on-surface">Quantity & Measurement</Text>
            <Text className="font-label-sm text-label-sm text-primary font-medium">
              {form.quantity} {UNITS.find(([unit]) => unit === form.unit)?.[1].toLowerCase().replace(/s$/, form.quantity === 1 ? '' : 's') ?? form.unit} selected
            </Text>
          </View>
          <View className="flex-row items-center justify-between gap-space-md">
            <View className="flex-row items-center bg-surface-container-low dark:bg-surface-container rounded-xl p-1">
              <QuantityButton icon="remove" label="Decrease quantity" onPress={() => set({ quantity: Math.max(1, form.quantity - 1) })} />
              <Text className="w-12 text-center font-headline-sm text-headline-sm text-on-surface">{form.quantity}</Text>
              <QuantityButton icon="add" label="Increase quantity" onPress={() => set({ quantity: form.quantity + 1 })} />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-1.5 py-1 flex-grow justify-end">
              {UNITS.map(([unit, label]) => {
                const active = form.unit === unit;
                return (
                  <Pressable
                    key={unit}
                    onPress={() => set({ unit })}
                    className={`px-3 py-1.5 rounded-lg ${active ? 'bg-primary' : 'bg-surface-container-low dark:bg-surface-container'}`}
                    style={active ? shadow('sm') : undefined}>
                    <Text className={`font-label-sm text-label-sm ${active ? 'text-on-primary' : 'text-on-surface-variant'}`}>{label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>

        {/* 5. Storage Location Selector */}
        <View className={`w-full rounded-2xl p-space-md gap-space-sm ${tone.card}`} style={shadow('sm')}>
          <View className="flex-row items-center justify-between">
            <Text className="font-label-lg text-label-lg text-on-surface">Storage Zone</Text>
            <Text className="font-label-sm text-label-sm text-on-surface-variant">Recommended: {zones[recommendedZone].label}</Text>
          </View>
          <View className="flex-row gap-1.5 p-1.5 bg-surface-container-low dark:bg-surface-container rounded-xl">
            {zoneOrder.map((id) => {
              const active = zone === id;
              return (
                <Pressable
                  key={id}
                  onPress={() => set({ zone: id, expiresOn: undefined })}
                  className={`flex-1 items-center justify-center py-2.5 rounded-lg ${active ? 'bg-surface-container-lowest dark:bg-surface-container-highest' : ''}`}
                  style={active ? shadow('sm') : undefined}>
                  <Icon name={zones[id].icon} filled={active} className={`text-[20px] ${active ? 'text-primary' : 'text-on-surface-variant'}`} />
                  <Text className={`font-label-md text-label-md mt-0.5 ${active ? 'text-primary' : 'text-on-surface-variant'}`}>{zones[id].label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* 6. Dates & Smart Expiry Helper */}
        <View className={`w-full rounded-2xl p-space-md gap-space-md ${tone.card}`} style={shadow('sm')}>
          <View className="flex-row gap-space-sm">
            <DateField label="Purchased" icon="calendar_today" iconColor="text-on-surface-variant" value={formatRelativeDay(form.purchasedOn)} onPress={() => setDateSheet('purchased')} />
            <DateField label="Expires" icon="event_upcoming" iconColor="text-secondary" value={formatLong(expiresOn)} bold onPress={() => setDateSheet('expires')} />
          </View>
          <View className="rounded-xl bg-primary-fixed/30 dark:bg-[#1C382B] dark:border dark:border-[#2B5440] p-space-md flex-row items-start gap-space-sm">
            <Icon name="tips_and_updates" filled className="text-[22px] text-primary mt-0.5" />
            <View className="gap-1.5 flex-1">
              <View className="flex-row items-center gap-1.5">
                <Text className="font-label-md text-label-md text-on-primary-fixed dark:text-primary font-bold">Smart Shelf-Life</Text>
                <View className="px-1.5 rounded bg-primary">
                  <Text className="font-label-sm text-label-sm text-on-primary font-medium">+{life.min} Days</Text>
                </View>
              </View>
              <Text className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                {life.max === 0
                  ? `${categories[category ?? 'other'].noun} shouldn't be stored ${zoneClimate[zone]} — pick another zone.`
                  : `${categories[category ?? 'other'].noun} typically stays peak quality for ${life.min === life.max ? life.min : `${life.min}–${life.max}`} days ${zoneClimate[zone]}.`}
              </Text>
              {life.max > life.min && daysBetween(expiresOn, bufferExpiry) !== 0 && (
                <Pressable onPress={() => set({ expiresOn: bufferExpiry })} className="flex-row items-center gap-1 self-start">
                  <Text className="font-label-sm text-label-sm text-primary font-bold">
                    Apply {life.max}-day buffer ({formatLong(bufferExpiry)})
                  </Text>
                  <Icon name="arrow_forward" className="text-[14px] text-primary" />
                </Pressable>
              )}
            </View>
          </View>
        </View>

        {/* 7. Reminder / Radar Alert Toggle */}
        <View className={`w-full rounded-2xl p-space-md ${tone.card}`} style={shadow('sm')}>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-space-sm flex-1">
              <View className="w-10 h-10 rounded-xl bg-secondary-fixed/50 dark:bg-[#3B2312] items-center justify-center">
                <Icon name="notifications_active" filled className="text-[20px] text-secondary" />
              </View>
              <View className="flex-1">
                <Text className="font-label-lg text-label-lg text-on-surface">Expiry Radar Alert</Text>
                <Text className="font-body-sm text-body-sm text-on-surface-variant">
                  Notify {alertDaysBefore} {alertDaysBefore === 1 ? 'day' : 'days'} before spoiling
                </Text>
              </View>
            </View>
            <Switch size="lg" label="Expiry Radar Alert" value={form.alertEnabled} onValueChange={(alertEnabled) => set({ alertEnabled })} />
          </View>
        </View>

        {/* 8. Bottom Action CTAs */}
        <View className="w-full pt-space-xs gap-space-sm">
          <Pressable
            onPress={() => save(false)}
            className="w-full h-12 rounded-xl bg-primary flex-row items-center justify-center gap-2 active:scale-[0.98]"
            style={shadow('primaryButton')}>
            <Icon name="check_circle" className="text-[20px] text-on-primary" />
            <Text className="font-label-lg text-label-lg text-on-primary">{editing ? 'Save Changes' : 'Save to Pantry'}</Text>
          </Pressable>
          {!editing && (
            <Pressable onPress={() => save(true)} className="w-full h-10 rounded-xl items-center justify-center active:bg-primary-fixed/30">
              <Text className="font-label-lg text-label-lg text-primary">Save & Add Another</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>

      <DateSheet
        visible={dateSheet === 'purchased'}
        title="Purchased"
        past
        value={form.purchasedOn}
        onChange={(purchasedOn) => set({ purchasedOn })}
        onClose={() => setDateSheet(undefined)}
      />
      <DateSheet
        visible={dateSheet === 'expires'}
        title="Expires"
        value={expiresOn}
        onChange={(date) => set({ expiresOn: date })}
        onClose={() => setDateSheet(undefined)}
      />
    </KeyboardAvoidingView>
  );
}

function PhotoChip({ icon, label, onPress }: { icon: 'camera_alt' | 'photo_library'; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="flex-row items-center gap-1 px-space-sm py-1 rounded-full bg-surface-container dark:bg-surface-container-high active:scale-95">
      <Icon name={icon} className="text-[14px] text-on-surface-variant" />
      <Text className="font-label-sm text-label-sm text-on-surface-variant">{label}</Text>
    </Pressable>
  );
}

function CategoryChip({ emoji, label, active, onPress }: { emoji: string; label: string; active: boolean; onPress: () => void }) {
  const shadow = useShadow();
  return (
    <Pressable
      onPress={onPress}
      className={`h-9 px-3.5 rounded-full flex-row items-center gap-1.5 ${active ? 'bg-primary' : 'bg-surface-container-low dark:bg-surface-container'}`}
      style={active ? shadow('sm') : undefined}>
      <Text className="text-base">{emoji}</Text>
      <Text className={`font-label-md text-label-md ${active ? 'text-on-primary' : 'text-on-surface'}`}>{label}</Text>
    </Pressable>
  );
}

function QuantityButton({ icon, label, onPress }: { icon: 'add' | 'remove'; label: string; onPress: () => void }) {
  const shadow = useShadow();
  return (
    <Pressable
      accessibilityLabel={label}
      onPress={onPress}
      className="w-10 h-10 rounded-lg bg-surface-container-lowest dark:bg-surface-container-highest items-center justify-center active:scale-90"
      style={shadow('sm')}>
      <Icon name={icon} className="text-[18px] text-on-surface" />
    </Pressable>
  );
}

function DateField({
  label,
  icon,
  iconColor,
  value,
  bold,
  onPress,
}: {
  label: string;
  icon: 'calendar_today' | 'event_upcoming';
  iconColor: string;
  value: string;
  bold?: boolean;
  onPress: () => void;
}) {
  return (
    <View className="flex-1 gap-1">
      <Text className="font-label-sm text-label-sm text-on-surface-variant">{label}</Text>
      <Pressable onPress={onPress} className="flex-row items-center h-11 px-3 rounded-xl bg-surface-container-low dark:bg-surface-container">
        <Icon name={icon} className={`text-[18px] mr-2 ${iconColor}`} />
        <Text numberOfLines={1} className={`font-body-sm text-body-sm text-on-surface ${bold ? 'font-semibold' : ''}`}>
          {value}
        </Text>
      </Pressable>
    </View>
  );
}
