import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { Avatar } from '@/components/avatar';
import { Icon, type IconName } from '@/components/ui/icon';
import { Sheet, SheetOption } from '@/components/ui/sheet';
import { Text, TextInput } from '@/components/ui/text';
import { pickPhoto } from '@/services/photos';
import { rescheduleNudges, summarize, useActiveItems, useEvents, zeroWasteStreak } from '@/store/pantry';
import { updateSettings, useSettings, type ThemePreference } from '@/store/settings';
import { useShadow } from '@/theme/shadows';
import { useTheme } from '@/theme/theme-provider';
import { tone } from '@/theme/tones';

const THEMES: { value: ThemePreference; label: string; icon: IconName }[] = [
  { value: 'system', label: 'Match system', icon: 'brightness_auto' },
  { value: 'light', label: 'Light', icon: 'light_mode' },
  { value: 'dark', label: 'Dark', icon: 'dark_mode' },
];

function formatHour(hour: number) {
  return `${hour % 12 === 0 ? 12 : hour % 12}:00 ${hour < 12 ? 'AM' : 'PM'}`;
}

function monthStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

export default function ProfileScreen() {
  const shadow = useShadow();
  const { scheme, colors } = useTheme();
  const settings = useSettings();
  const items = useActiveItems();
  const events = useEvents();
  const [sheet, setSheet] = useState<'name' | 'theme' | 'alerts' | undefined>();
  const [name, setName] = useState(settings.userName);

  const lifetime = summarize(items, events);
  const month = summarize(items, events, monthStart());
  const streak = zeroWasteStreak(events, items);
  const rank = lifetime.rescuedItems >= 50 ? 'Pro Pantry Saver' : lifetime.rescuedItems >= 10 ? 'Pantry Saver' : 'Pantry Rookie';

  return (
    <View className="flex-1 bg-surface">
      <AppHeader page="User Profile" />
      <ScrollView className="flex-1" contentContainerClassName="w-full max-w-[480px] self-center px-margin pt-1 pb-8 gap-space-md">
        {/* Profile Header Utilities Bar */}
        <View className="flex-row items-center justify-between py-space-xs">
          <View>
            <Text className="font-headline-md text-headline-md text-on-surface tracking-tight">Profile</Text>
            <Text className="font-body-sm text-body-sm text-on-surface-variant">Household steward & pantry stats</Text>
          </View>
          <Pressable
            accessibilityLabel="Quick settings"
            onPress={() => setSheet('theme')}
            className="w-10 h-10 rounded-full bg-surface-container-low dark:bg-surface-container items-center justify-center active:scale-95"
            style={shadow('sm')}>
            <Icon name="tune" className="text-[20px] text-on-surface-variant" />
          </Pressable>
        </View>

        {/* User Identity Card */}
        <View className={`rounded-2xl p-space-md items-center ${tone.card}`} style={shadow('sm')}>
          <View className="relative mb-space-sm">
            <View className="w-24 h-24 rounded-full overflow-hidden bg-surface-container" style={shadow('card')}>
              <Avatar size={96} />
            </View>
            <Pressable
              accessibilityLabel="Change profile picture"
              onPress={async () => {
                const uri = await pickPhoto('library');
                if (uri) updateSettings({ avatar: uri });
              }}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary items-center justify-center active:scale-90"
              style={shadow('card')}>
              <Icon name="photo_camera" className="text-[16px] text-on-primary" />
            </Pressable>
          </View>
          <Pressable onPress={() => { setName(settings.userName); setSheet('name'); }}>
            <Text className="font-headline-sm text-headline-sm text-on-surface leading-tight text-center">
              {settings.userName || 'Add your name'}
            </Text>
          </Pressable>
          <Text className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">Local pantry • stored on this device</Text>
          <View className="mt-space-sm flex-row items-center gap-1.5 px-3 py-1 rounded-full bg-primary-fixed/40 dark:bg-[#1C382B] dark:border dark:border-[#2B5440]">
            <Icon name="eco" filled className="text-[15px] text-primary" />
            <Text className="font-label-sm text-label-sm text-on-primary-fixed dark:text-primary">{rank} • Household Lead</Text>
          </View>
        </View>

        {/* Lifetime Impact */}
        <View className={`rounded-2xl p-space-md gap-space-md ${tone.card}`} style={shadow('sm')}>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <View className="w-7 h-7 rounded-full bg-primary-fixed/50 dark:bg-[#1C382B] items-center justify-center">
                <Icon name="workspace_premium" className="text-[18px] text-primary" />
              </View>
              <Text className="font-label-lg text-label-lg text-on-surface">Lifetime Impact</Text>
            </View>
            <Text className="font-label-sm text-label-sm text-primary font-semibold">Updated Today</Text>
          </View>
          <View className="flex-row flex-wrap gap-space-sm">
            <ImpactStat label="Rescued" icon="inventory_2" value={String(lifetime.rescuedItems)} unit="items" />
            <ImpactStat label="Saved" icon="payments" value={`$${(lifetime.savedCents / 100).toFixed(2)}`} />
            <ImpactStat label="CO₂e Averted" icon="forest" value={lifetime.co2Kg.toFixed(1)} unit="kg" />
            <ImpactStat
              label="Streak"
              icon="local_fire_department"
              iconColor="text-secondary"
              value={String(streak >= 14 ? Math.floor(streak / 7) : streak)}
              unit={streak >= 14 ? 'wks' : streak === 1 ? 'day' : 'days'}
            />
          </View>
          <View className="rounded-xl overflow-hidden">
            <LinearGradient
              colors={scheme === 'dark' ? ['#1C382B', '#1C382B', colors['surface-container']] : [`${colors.primary}1a`, `${colors['primary-fixed']}33`, `${colors.primary}0d`]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ padding: 8, gap: 6 }}>
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-1.5">
                  <Icon name="military_tech" filled className="text-[18px] text-primary" />
                  <Text className="font-label-sm text-label-sm font-semibold text-primary">Eaten, not tossed, this month</Text>
                </View>
                <Text className="font-label-sm text-label-sm text-on-surface-variant font-medium">{month.freshnessPct}%</Text>
              </View>
              <View className="w-full h-2 rounded-full bg-surface-container-high overflow-hidden">
                <View className="h-full bg-primary rounded-full" style={{ width: `${month.freshnessPct}%` }} />
              </View>
            </LinearGradient>
          </View>
        </View>

        {/* Account & Preferences */}
        <Group title="Account & Preferences">
          <Row icon="person" title="Edit Profile" detail="Name and photo" onPress={() => { setName(settings.userName); setSheet('name'); }} />
          <Row
            icon="shelves"
            title="Pantry Settings"
            detail={`Theme: ${THEMES.find((theme) => theme.value === settings.theme)?.label}`}
            onPress={() => setSheet('theme')}
          />
          <Row icon="group" title="Household Management" detail="Share one pantry with your household" soon />
          <Row
            icon="notification_add"
            title="Alert Configuration"
            detail={`${settings.alertDaysBefore}-day early warning at ${formatHour(settings.alertHour)}`}
            onPress={() => setSheet('alerts')}
            last
          />
        </Group>

        <Group title="Integrations & Utilities">
          <Row icon="storefront" title="Connected Stores & Loyalty" detail="Import receipts automatically" soon />
          <Row icon="support_agent" title="Help & Support" detail="FAQ and guides" soon last />
        </Group>

        <Text className="font-label-sm text-label-sm text-on-surface-variant text-center pt-2">
          Expiry Radar v{Constants.expoConfig?.version ?? '1.0.0'} • Waste less, save more
        </Text>
      </ScrollView>

      <Sheet visible={sheet === 'name'} onClose={() => setSheet(undefined)} title="Your name" subtitle="Used for your morning greeting.">
        <TextInput
          value={name}
          onChangeText={setName}
          autoFocus
          placeholder="First name"
          onSubmitEditing={() => { updateSettings({ userName: name.trim() }); setSheet(undefined); }}
          className="h-12 px-4 rounded-xl bg-surface-container-low dark:bg-surface-container font-body-md text-body-md text-on-surface"
        />
        <Pressable
          onPress={() => { updateSettings({ userName: name.trim() }); setSheet(undefined); }}
          className="mt-2 h-12 rounded-xl bg-primary items-center justify-center">
          <Text className="font-label-lg text-label-lg text-on-primary">Save</Text>
        </Pressable>
      </Sheet>

      <Sheet visible={sheet === 'theme'} onClose={() => setSheet(undefined)} title="Appearance">
        {THEMES.map((theme) => (
          <SheetOption
            key={theme.value}
            icon={theme.icon}
            label={theme.label}
            selected={settings.theme === theme.value}
            onPress={() => updateSettings({ theme: theme.value })}
          />
        ))}
      </Sheet>

      <Sheet visible={sheet === 'alerts'} onClose={() => setSheet(undefined)} title="Smart nudges" subtitle="When should the radar remind you?">
        <View className="flex-row gap-2">
          {[1, 2, 3].map((days) => (
            <Choice key={days} label={days === 1 ? '1 day before' : `${days} days before`} active={settings.alertDaysBefore === days} onPress={() => { updateSettings({ alertDaysBefore: days }); rescheduleNudges(); }} />
          ))}
        </View>
        <View className="flex-row gap-2">
          {[7, 8, 12, 18].map((hour) => (
            <Choice key={hour} label={formatHour(hour)} active={settings.alertHour === hour} onPress={() => { updateSettings({ alertHour: hour }); rescheduleNudges(); }} />
          ))}
        </View>
      </Sheet>
    </View>
  );
}

function ImpactStat({ label, icon, iconColor = 'text-primary', value, unit }: { label: string; icon: IconName; iconColor?: string; value: string; unit?: string }) {
  const shadow = useShadow();
  return (
    <View className={`rounded-xl p-space-sm gap-1 ${tone.insetLow}`} style={{ width: '48.5%' }}>
      <View className="flex-row items-center justify-between">
        <Text className="font-label-sm text-label-sm text-on-surface-variant">{label}</Text>
        <View className="w-6 h-6 rounded-lg bg-surface-container-lowest dark:bg-surface-container-high items-center justify-center" style={shadow('sm')}>
          <Icon name={icon} className={`text-[16px] ${iconColor}`} />
        </View>
      </View>
      <View className="flex-row items-baseline gap-1">
        <Text className="font-headline-md text-headline-md text-on-surface tracking-tight">{value}</Text>
        {unit && <Text className="font-label-sm text-label-sm text-on-surface-variant">{unit}</Text>}
      </View>
    </View>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  const shadow = useShadow();
  return (
    <View className="gap-space-xs">
      <Text className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider px-1">{title}</Text>
      <View className={`rounded-2xl overflow-hidden ${tone.card}`} style={shadow('sm')}>
        {children}
      </View>
    </View>
  );
}

function Row({ icon, title, detail, onPress, soon, last }: { icon: IconName; title: string; detail: string; onPress?: () => void; soon?: boolean; last?: boolean }) {
  return (
    <Pressable
      disabled={soon}
      onPress={onPress}
      className={`flex-row items-center justify-between p-space-md active:bg-surface-container-low ${last ? '' : 'border-b border-surface-container-low dark:border-outline-variant/40'}`}>
      <View className={`flex-row items-center gap-space-md min-w-0 flex-1 ${soon ? 'opacity-60' : ''}`}>
        <View className="w-10 h-10 rounded-xl bg-surface-container-low dark:bg-surface-container-high items-center justify-center shrink-0">
          <Icon name={icon} className="text-[20px] text-on-surface" />
        </View>
        <View className="flex-col min-w-0 flex-1">
          <Text numberOfLines={1} className="font-label-lg text-label-lg text-on-surface">{title}</Text>
          <Text numberOfLines={1} className="font-body-sm text-body-sm text-on-surface-variant">{detail}</Text>
        </View>
      </View>
      {soon ? (
        <View className="px-2 py-0.5 rounded-full bg-surface-container-high dark:bg-surface-container-highest">
          <Text className="font-label-sm text-label-sm text-on-surface-variant">Soon</Text>
        </View>
      ) : (
        <Icon name="chevron_right" className="text-[20px] text-on-surface-variant" />
      )}
    </Pressable>
  );
}

function Choice({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-1 h-10 rounded-xl items-center justify-center ${active ? 'bg-primary' : 'bg-surface-container-low dark:bg-surface-container'}`}>
      <Text className={`font-label-md text-label-md ${active ? 'text-on-primary' : 'text-on-surface'}`}>{label}</Text>
    </Pressable>
  );
}
