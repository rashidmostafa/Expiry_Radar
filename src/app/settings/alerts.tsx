import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SettingsHeader } from '@/components/settings-header';
import { TimeSheet } from '@/components/time-sheet';
import { Icon, type IconName } from '@/components/ui/icon';
import { Switch } from '@/components/ui/switch';
import { Text } from '@/components/ui/text';
import { rescheduleNudges } from '@/store/pantry';
import { defaultSettings, formatClock, updateSettings, useSettings, type NudgeType, type Settings } from '@/store/settings';
import { useShadow } from '@/theme/shadows';
import { tone } from '@/theme/tones';

const WINDOWS = [
  { days: 1, label: '1 Day', detail: 'Urgent' },
  { days: 2, label: '2 Days Ahead', detail: 'Recommended' },
  { days: 3, label: '3 Days Ahead', detail: 'Balanced' },
  { days: 5, label: '5 Days Ahead', detail: 'Bulk Preppers' },
];

const CATEGORIES: { type: NudgeType; title: string; detail: string; icon: IconName; tile: string; color: string }[] = [
  { type: 'expiry', title: 'Expiry Danger Alerts', detail: 'A warning when food is inside your early-warning window.', icon: 'alarm', tile: tone.coralTile, color: 'text-tertiary' },
  { type: 'duplicates', title: 'Duplicate Item Alerts', detail: 'Spots when two of the same item are open or in the fridge.', icon: 'content_copy', tile: tone.amberTile, color: 'text-secondary' },
  { type: 'recipes', title: 'Recipe Rescue Matches', detail: 'Quick recipes that use high-risk ingredients, plus the evening cook nudge.', icon: 'soup_kitchen', tile: tone.freshBg, color: 'text-primary' },
  { type: 'weekly', title: 'Weekly Impact & Waste Win', detail: 'Sunday summary of money saved, items rescued and streaks.', icon: 'emoji_events', tile: tone.coralTile, color: 'text-tertiary' },
  { type: 'shelfLife', title: 'Shelf-Life Extension Nudges', detail: 'Suggests freezing meat, fish and bread before they turn.', icon: 'ac_unit', tile: 'bg-surface-container-high dark:bg-surface-container-highest', color: 'text-on-surface' },
  { type: 'patterns', title: 'Consumption Pattern Insights', detail: 'Notices what you used up and suggests restocking it.', icon: 'insights', tile: 'bg-surface-container-high dark:bg-surface-container-highest', color: 'text-on-surface' },
];

type Draft = Pick<Settings, 'alertDaysBefore' | 'alertHour' | 'nudgeTypes' | 'quietHours' | 'digestAt' | 'eveningNudge'>;

export default function AlertConfigurationScreen() {
  const insets = useSafeAreaInsets();
  const shadow = useShadow();
  const settings = useSettings();
  const [draft, setDraft] = useState<Draft>(() => ({
    alertDaysBefore: settings.alertDaysBefore,
    alertHour: settings.alertHour,
    nudgeTypes: settings.nudgeTypes,
    quietHours: settings.quietHours,
    digestAt: settings.digestAt,
    eveningNudge: settings.eveningNudge,
  }));
  const [picker, setPicker] = useState<'from' | 'to' | 'digest' | 'alert' | undefined>();

  const set = (patch: Partial<Draft>) => setDraft((current) => ({ ...current, ...patch }));
  const active = Object.values(draft.nudgeTypes).filter(Boolean).length;

  const save = () => {
    updateSettings(draft);
    rescheduleNudges();
    router.back();
  };

  const reset = () =>
    setDraft({
      alertDaysBefore: defaultSettings.alertDaysBefore,
      alertHour: defaultSettings.alertHour,
      nudgeTypes: defaultSettings.nudgeTypes,
      quietHours: defaultSettings.quietHours,
      digestAt: defaultSettings.digestAt,
      eveningNudge: defaultSettings.eveningNudge,
    });

  return (
    <View className="flex-1 bg-surface">
      <SettingsHeader title="Alert Configuration" />
      <ScrollView className="flex-1" contentContainerClassName="w-full max-w-[480px] self-center px-margin pt-3 gap-space-lg" contentContainerStyle={{ paddingBottom: 24 }}>
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-1.5">
            <Icon name="radar" className="text-[16px] text-primary" />
            <Text className="font-label-sm text-label-sm text-primary uppercase tracking-wider font-bold">Smart Expiry Radar</Text>
          </View>
          <Pressable onPress={reset} className="flex-row items-center gap-1">
            <Icon name="restart_alt" className="text-[16px] text-tertiary" />
            <Text className="font-label-sm text-label-sm text-tertiary">Reset All</Text>
          </Pressable>
        </View>

        <View className="flex-row items-center gap-4 p-4 rounded-2xl bg-surface-container-high/70 dark:bg-surface-container">
          <View className="w-12 h-12 rounded-full bg-primary/15 items-center justify-center">
            <Icon name="notifications_active" className="text-[24px] text-primary" />
          </View>
          <View className="flex-1">
            <Text className="font-headline-sm text-headline-sm text-on-surface">Stay ahead of food waste</Text>
            <Text className="font-body-sm text-body-sm text-on-surface-variant">Timely kitchen reminders so fresh herbs, dairy and leftovers get enjoyed, not tossed.</Text>
          </View>
        </View>

        {/* Early warning */}
        <View className="gap-space-sm">
          <View className="flex-row items-center justify-between">
            <Text className="font-headline-md text-headline-md text-on-surface">Early Warning Window</Text>
            <Text className="font-label-sm text-label-sm text-primary">Stage 1 Alert</Text>
          </View>
          <View className={`rounded-2xl p-4 gap-3 ${tone.card}`} style={shadow('sm')}>
            <View className="flex-row items-center justify-between">
              <Text className="font-label-lg text-label-lg text-on-surface">Notify Before Expiry</Text>
              <View className={`px-2 py-0.5 rounded-full ${tone.freshBg}`}>
                <Text className={`font-label-sm text-label-sm ${tone.freshText}`}>
                  {draft.alertDaysBefore} {draft.alertDaysBefore === 1 ? 'Day' : 'Days'} Ahead
                </Text>
              </View>
            </View>
            <View className="flex-row flex-wrap gap-2 p-1.5 rounded-2xl bg-surface-container-low dark:bg-surface-container-high">
              {WINDOWS.map((option) => {
                const selected = draft.alertDaysBefore === option.days;
                return (
                  <Pressable
                    key={option.days}
                    onPress={() => set({ alertDaysBefore: option.days })}
                    className={`items-center py-2.5 rounded-xl ${selected ? 'bg-primary' : ''}`}
                    style={{ width: '48.5%' }}>
                    <Text className={`font-label-md text-label-md ${selected ? 'text-on-primary' : 'text-on-surface'}`}>{option.label}</Text>
                    <Text className={`font-label-sm text-label-sm ${selected ? 'text-on-primary/80' : 'text-on-surface-variant'}`}>{option.detail}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Pressable onPress={() => setPicker('alert')} className={`flex-row items-center justify-between p-3 rounded-xl ${tone.insetLow}`}>
              <View className="flex-row items-center gap-2">
                <Icon name="schedule" className="text-[18px] text-on-surface-variant" />
                <Text className="font-label-md text-label-md text-on-surface">Alert delivery time</Text>
              </View>
              <Text className="font-label-md text-label-md text-primary">{formatClock(draft.alertHour * 60)}</Text>
            </Pressable>
            <View className={`flex-row items-start gap-2 p-3 rounded-xl ${tone.insetLow}`}>
              <Icon name="eco" className="text-[16px] text-primary" />
              <Text className="font-body-sm text-body-sm text-on-surface-variant flex-1">Allows enough time to cook, freeze or repurpose food before it spoils.</Text>
            </View>
          </View>
        </View>

        {/* Categories */}
        <View className="gap-space-sm">
          <View className="flex-row items-center justify-between">
            <Text className="font-headline-md text-headline-md text-on-surface">Smart Nudge Categories</Text>
            <Text className="font-label-sm text-label-sm text-on-surface-variant">
              {active} of {CATEGORIES.length} active
            </Text>
          </View>
          <View className={`rounded-2xl overflow-hidden ${tone.card}`} style={shadow('sm')}>
            {CATEGORIES.map((category, index) => (
              <View key={category.type} className={`flex-row items-start gap-3 p-4 ${index < CATEGORIES.length - 1 ? 'border-b border-surface-container-low dark:border-outline-variant/40' : ''}`}>
                <View className={`w-10 h-10 rounded-xl items-center justify-center ${category.tile}`}>
                  <Icon name={category.icon} className={`text-[20px] ${category.color}`} />
                </View>
                <View className="flex-1">
                  <Text className="font-label-lg text-label-lg text-on-surface">{category.title}</Text>
                  <Text className="font-body-sm text-body-sm text-on-surface-variant">{category.detail}</Text>
                </View>
                <Switch
                  size="lg"
                  label={category.title}
                  value={draft.nudgeTypes[category.type]}
                  onValueChange={(value) => set({ nudgeTypes: { ...draft.nudgeTypes, [category.type]: value } })}
                />
              </View>
            ))}
          </View>
        </View>

        {/* Quiet hours */}
        <View className="gap-space-sm">
          <View className="flex-row items-center justify-between">
            <Text className="font-headline-md text-headline-md text-on-surface">Quiet Hours & Timing</Text>
            <Text className="font-label-sm text-label-sm text-primary">Sleep Friendly</Text>
          </View>
          <View className={`rounded-2xl p-4 gap-3 ${tone.card}`} style={shadow('sm')}>
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <Icon name="bedtime" className="text-[22px] text-on-surface" />
                <View>
                  <Text className="font-label-lg text-label-lg text-on-surface">Quiet Hours</Text>
                  <Text className="font-body-sm text-body-sm text-on-surface-variant">Nudges wait until morning</Text>
                </View>
              </View>
              <Switch size="lg" label="Quiet hours" value={draft.quietHours.enabled} onValueChange={(enabled) => set({ quietHours: { ...draft.quietHours, enabled } })} />
            </View>
            {draft.quietHours.enabled && (
              <View className="flex-row gap-3">
                <TimeField label="From" value={formatClock(draft.quietHours.from)} icon="schedule" onPress={() => setPicker('from')} />
                <TimeField label="To" value={formatClock(draft.quietHours.to)} icon="wb_twilight" onPress={() => setPicker('to')} />
              </View>
            )}
            <Text className="font-label-md text-label-md text-on-surface-variant">Preferred Daily Digest Time</Text>
            <Pressable onPress={() => setPicker('digest')} className={`flex-row items-center justify-between p-3 rounded-xl ${tone.insetLow}`}>
              <View className="flex-row items-center gap-2">
                <Icon name="light_mode" className="text-[18px] text-on-surface" />
                <Text className="font-label-md text-label-md text-on-surface">Morning Digest</Text>
              </View>
              <View className="px-2.5 py-1 rounded-full bg-surface-container-lowest dark:bg-surface-container-highest">
                <Text className="font-label-md text-label-md text-on-surface">{draft.digestAt === null ? 'Off' : formatClock(draft.digestAt)}</Text>
              </View>
            </Pressable>
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="font-label-md text-label-md text-on-surface">Evening Cook Nudge</Text>
                <Text className="font-body-sm text-body-sm text-on-surface-variant">5:30 PM on days something needs using</Text>
              </View>
              <Switch label="Evening cook nudge" value={draft.eveningNudge} onValueChange={(eveningNudge) => set({ eveningNudge })} />
            </View>
          </View>
        </View>

        {/* Channels */}
        <View className="gap-space-sm">
          <View className="flex-row items-center justify-between">
            <Text className="font-headline-md text-headline-md text-on-surface">Delivery Channels</Text>
            <Text className="font-label-sm text-label-sm text-on-surface-variant">This device</Text>
          </View>
          <View className={`rounded-2xl p-3 gap-2 ${tone.card}`} style={shadow('sm')}>
            <Channel icon="smartphone" title="Push Notifications" detail="Real-time alerts on your lock screen" status="On" />
            <Channel icon="mail" title="Email Digest" detail="Sunday kitchen recap & tips" status="Soon" />
            <Channel icon="sms" title="SMS Urgent Flash" detail="Critical <12h reminders" status="Soon" />
          </View>
        </View>
      </ScrollView>

      <View className="px-margin pt-2 gap-1.5 w-full max-w-[480px] self-center" style={{ paddingBottom: insets.bottom + 12 }}>
        <Pressable onPress={save} className="h-14 rounded-full bg-primary flex-row items-center justify-center gap-2 active:scale-[0.98]" style={shadow('primaryButton')}>
          <Icon name="check_circle" className="text-[20px] text-on-primary" />
          <Text className="font-label-lg text-label-lg text-on-primary">Save Preferences</Text>
        </Pressable>
        <View className="flex-row items-center justify-center gap-1">
          <Icon name="lock" className="text-[12px] text-on-surface-variant" />
          <Text className="font-label-sm text-label-sm text-on-surface-variant">All alerts are scheduled and processed on this device</Text>
        </View>
      </View>

      <TimeSheet visible={picker === 'from'} title="Quiet hours start" value={draft.quietHours.from} from={18 * 60} to={23 * 60 + 30} onChange={(from) => set({ quietHours: { ...draft.quietHours, from } })} onClose={() => setPicker(undefined)} />
      <TimeSheet visible={picker === 'to'} title="Quiet hours end" value={draft.quietHours.to} from={5 * 60} to={10 * 60} onChange={(to) => set({ quietHours: { ...draft.quietHours, to } })} onClose={() => setPicker(undefined)} />
      <TimeSheet visible={picker === 'digest'} title="Morning digest time" value={draft.digestAt ?? 8 * 60} from={6 * 60} to={11 * 60} onChange={(digestAt) => set({ digestAt })} onClose={() => setPicker(undefined)} />
      <TimeSheet
        visible={picker === 'alert'}
        title="Expiry alert time"
        value={draft.alertHour * 60}
        from={6 * 60}
        to={21 * 60}
        onChange={(minutes) => set({ alertHour: Math.floor(minutes / 60) })}
        onClose={() => setPicker(undefined)}
      />
    </View>
  );
}

function TimeField({ label, value, icon, onPress }: { label: string; value: string; icon: IconName; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className={`flex-1 p-3 rounded-xl ${tone.insetLow}`}>
      <Text className="font-label-sm text-label-sm text-on-surface-variant uppercase">{label}</Text>
      <View className="flex-row items-center justify-between mt-1">
        <Text className="font-headline-sm text-headline-sm text-on-surface">{value}</Text>
        <Icon name={icon} className="text-[18px] text-on-surface-variant" />
      </View>
    </Pressable>
  );
}

function Channel({ icon, title, detail, status }: { icon: IconName; title: string; detail: string; status: 'On' | 'Soon' }) {
  return (
    <View className={`flex-row items-center gap-3 p-3 rounded-xl ${tone.insetLow} ${status === 'Soon' ? 'opacity-60' : ''}`}>
      <View className="w-9 h-9 rounded-lg bg-surface-container-lowest dark:bg-surface-container-highest items-center justify-center">
        <Icon name={icon} className="text-[18px] text-on-surface" />
      </View>
      <View className="flex-1">
        <Text className="font-label-md text-label-md text-on-surface">{title}</Text>
        <Text className="font-body-sm text-body-sm text-on-surface-variant">{detail}</Text>
      </View>
      {status === 'On' ? (
        <Icon name="check_box" filled className="text-[24px] text-primary" />
      ) : (
        <View className="px-2 py-0.5 rounded-full bg-surface-container-high dark:bg-surface-container-highest">
          <Text className="font-label-sm text-label-sm text-on-surface-variant">Soon</Text>
        </View>
      )}
    </View>
  );
}
