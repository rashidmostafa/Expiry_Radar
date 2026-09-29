import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Share, View } from 'react-native';

import { FormMessage, NotConfigured } from '@/components/auth-ui';
import { Avatar } from '@/components/avatar';
import { SettingsHeader } from '@/components/settings-header';
import { Icon, type IconName } from '@/components/ui/icon';
import { Sheet, SheetOption } from '@/components/ui/sheet';
import { Text, TextInput } from '@/components/ui/text';
import { DIETS } from '@/data/household';
import { cloudConfigured } from '@/lib/supabase';
import { useSyncStatus } from '@/services/sync';
import {
  createHousehold,
  inviteLink,
  joinHousehold,
  leaveHousehold,
  newInviteCode,
  removeMember,
  renameHousehold,
  signOut,
  syncNow,
  useAccount,
  type Member,
} from '@/store/account';
import { updateSettings, useSettings, type DietId } from '@/store/settings';
import { useShadow } from '@/theme/shadows';
import { tone } from '@/theme/tones';

const MEMBER_TINTS = ['bg-secondary-container', 'bg-tertiary-fixed dark:bg-[#3A1813]', 'bg-primary-fixed dark:bg-[#1C382B]'];

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function timeAgo(iso?: string) {
  if (!iso) return 'not yet';
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.round(minutes / 60)}h ago`;
}

export default function HouseholdScreen() {
  const params = useLocalSearchParams<{ code?: string }>();
  const account = useAccount();

  return (
    <View className="flex-1 bg-surface">
      <SettingsHeader title="Household Management" />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="w-full max-w-[480px] self-center px-margin pt-3 pb-10 gap-space-lg">
        {!cloudConfigured ? (
          <>
            <NotConfigured />
            <HouseholdPreferences />
          </>
        ) : !account.ready ? (
          <ActivityIndicator className="mt-10" />
        ) : !account.user ? (
          <SignedOut code={params.code} />
        ) : !account.household ? (
          <NoHousehold initialCode={params.code} />
        ) : (
          <HouseholdHome />
        )}
      </ScrollView>
    </View>
  );
}

function SignedOut({ code }: { code?: string }) {
  const shadow = useShadow();
  return (
    <>
      <View className={`rounded-3xl p-6 items-center gap-3 ${tone.card}`} style={shadow('card')}>
        <View className="w-16 h-16 rounded-full bg-primary-fixed dark:bg-[#1C382B] items-center justify-center">
          <Icon name="diversity_3" className="text-[32px] text-primary" />
        </View>
        <Text className="font-headline-md text-headline-md text-on-surface text-center">Share one pantry with your household</Text>
        <Text className="font-body-md text-body-md text-on-surface-variant text-center">
          Everyone sees the same fridge, freezer and restock list, and gets nudges before shared food expires.
          {code ? ` Log in to join with invite code ${code}.` : ''}
        </Text>
        <Pressable onPress={() => router.push('/auth/login')} className="self-stretch h-12 rounded-full bg-primary items-center justify-center mt-2" style={shadow('primaryButton')}>
          <Text className="font-label-lg text-label-lg text-on-primary">Log In</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/auth/signup')} className="self-stretch h-12 rounded-full bg-surface-container dark:bg-surface-container-high items-center justify-center">
          <Text className="font-label-lg text-label-lg text-on-surface">Create Free Account</Text>
        </Pressable>
      </View>
      <HouseholdPreferences />
    </>
  );
}

function NoHousehold({ initialCode }: { initialCode?: string }) {
  const shadow = useShadow();
  const { userName } = useSettings();
  const { user } = useAccount();
  const firstName = userName || user?.displayName?.split(' ')[0];
  const [name, setName] = useState(firstName ? `${firstName}’s Kitchen` : 'Our Kitchen');
  const [code, setCode] = useState(initialCode?.toUpperCase() ?? '');
  const [busy, setBusy] = useState<'create' | 'join' | undefined>();
  const [error, setError] = useState<string | undefined>();

  const run = async (kind: 'create' | 'join') => {
    setBusy(kind);
    setError(undefined);
    const result = kind === 'create' ? await createHousehold(name) : await joinHousehold(code);
    setBusy(undefined);
    if (result.error) setError(result.error);
  };

  return (
    <>
      {error && <FormMessage tone="error">{error}</FormMessage>}
      <View className={`rounded-2xl p-4 gap-3 ${tone.card}`} style={shadow('card')}>
        <View className="flex-row items-center gap-3">
          <View className={`w-11 h-11 rounded-full items-center justify-center ${tone.freshBg}`}>
            <Icon name="group_add" className="text-[22px] text-primary" />
          </View>
          <View className="flex-1">
            <Text className="font-headline-sm text-headline-sm text-on-surface">Join a household</Text>
            <Text className="font-body-sm text-body-sm text-on-surface-variant">Enter the 6-letter code a housemate shared.</Text>
          </View>
        </View>
        <TextInput
          value={code}
          onChangeText={(text) => setCode(text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
          placeholder="ABC234"
          autoCapitalize="characters"
          autoCorrect={false}
          className="h-14 px-4 rounded-xl bg-surface-container-low dark:bg-surface-container-high font-headline-md text-headline-md text-on-surface tracking-[6px] text-center"
        />
        <Pressable disabled={code.length !== 6 || !!busy} onPress={() => run('join')} className={`h-12 rounded-full bg-primary flex-row items-center justify-center gap-2 ${code.length !== 6 ? 'opacity-50' : ''}`}>
          {busy === 'join' && <ActivityIndicator color="white" />}
          <Text className="font-label-lg text-label-lg text-on-primary">Join Household</Text>
        </Pressable>
      </View>

      <View className={`rounded-2xl p-4 gap-3 ${tone.card}`} style={shadow('card')}>
        <View className="flex-row items-center gap-3">
          <View className={`w-11 h-11 rounded-full items-center justify-center ${tone.amberTile}`}>
            <Icon name="home" className="text-[22px] text-secondary" />
          </View>
          <View className="flex-1">
            <Text className="font-headline-sm text-headline-sm text-on-surface">Start a new household</Text>
            <Text className="font-body-sm text-body-sm text-on-surface-variant">Your current pantry becomes the shared one.</Text>
          </View>
        </View>
        <TextInput value={name} onChangeText={setName} placeholder="The Jenkins Kitchen" maxLength={60} className="h-12 px-4 rounded-xl bg-surface-container-low dark:bg-surface-container-high font-body-lg text-body-lg text-on-surface" />
        <Pressable disabled={!name.trim() || !!busy} onPress={() => run('create')} className="h-12 rounded-full bg-surface-container-high dark:bg-surface-container-highest flex-row items-center justify-center gap-2">
          {busy === 'create' && <ActivityIndicator />}
          <Text className="font-label-lg text-label-lg text-on-surface">Create Household</Text>
        </Pressable>
      </View>

      <HouseholdPreferences />
      <AccountRow />
    </>
  );
}

function HouseholdHome() {
  const shadow = useShadow();
  const { household, members, user } = useAccount();
  const sync = useSyncStatus();
  const [sheet, setSheet] = useState<'rename' | 'leave' | 'invite' | Member | undefined>();
  const [newName, setNewName] = useState(household?.name ?? '');
  const [error, setError] = useState<string | undefined>();
  if (!household || !user) return null;
  const owner = household.role === 'owner';

  const share = () =>
    Share.share({
      message: `Join our Expiry Radar kitchen "${household.name}" 🥬\nInvite code: ${household.inviteCode}\n${inviteLink(household.inviteCode)}`,
    }).catch(() => {});

  const syncLabel =
    sync.state === 'syncing' ? 'Syncing…' : sync.state === 'error' ? 'Offline — saved on this phone' : `Synced ${timeAgo(sync.lastSyncedAt)}`;

  return (
    <>
      {error && <FormMessage tone="error">{error}</FormMessage>}
      <View className="flex-row items-center gap-3 p-4 rounded-2xl bg-surface-container-high/70 dark:bg-surface-container">
        <View className={`w-12 h-12 rounded-full items-center justify-center ${tone.freshBg}`}>
          <Icon name="home" className="text-[24px] text-primary" />
        </View>
        <Pressable className="flex-1" disabled={!owner} onPress={() => { setNewName(household.name); setSheet('rename'); }}>
          <Text numberOfLines={1} className="font-headline-md text-headline-md text-on-surface">{household.name}</Text>
          <View className="flex-row items-center gap-1.5">
            <View className={`w-2 h-2 rounded-full ${sync.state === 'error' ? 'bg-secondary' : 'bg-primary'}`} />
            <Text numberOfLines={1} className="font-label-sm text-label-sm text-on-surface-variant">{syncLabel}</Text>
          </View>
        </Pressable>
        <Pressable onPress={() => setSheet('invite')} className="flex-row items-center gap-1 px-3.5 h-10 rounded-full bg-primary">
          <Icon name="person_add" className="text-[18px] text-on-primary" />
          <Text className="font-label-md text-label-md text-on-primary">Invite</Text>
        </Pressable>
      </View>

      <HouseholdPreferences />

      <View className={`rounded-2xl p-4 flex-row items-start gap-3 ${tone.card}`} style={shadow('sm')}>
        <View className={`w-11 h-11 rounded-xl items-center justify-center ${tone.amberTile}`}>
          <Icon name="sync_alt" className="text-[22px] text-secondary" />
        </View>
        <View className="flex-1 gap-1">
          <View className="flex-row items-center gap-2">
            <Text className="font-headline-sm text-headline-sm text-on-surface">Shared Pantry Mode</Text>
            <View className={`px-2 py-0.5 rounded-full ${tone.freshBg}`}>
              <Text className={`font-label-sm text-label-sm ${tone.freshText}`}>Active</Text>
            </View>
          </View>
          <Text className="font-body-md text-body-md text-on-surface-variant">
            Members scan, log used ingredients and get the same expiry nudges. Edits made offline sync when you&apos;re back online.
          </Text>
          <Pressable onPress={() => void syncNow()} className="self-start flex-row items-center gap-1 mt-1">
            <Icon name="sync" className="text-[16px] text-primary" />
            <Text className="font-label-md text-label-md text-primary">Sync now</Text>
          </Pressable>
          {sync.state === 'error' && sync.error && <Text className="font-body-sm text-body-sm text-secondary">{sync.error}</Text>}
        </View>
      </View>

      <View className="gap-space-sm">
        <View className="flex-row items-center justify-between">
          <Text className="font-headline-md text-headline-md text-on-surface">Household Members ({members.length})</Text>
          <Text className="font-label-sm text-label-sm text-primary">Real-time sync</Text>
        </View>
        {members.map((member, index) => (
          <Pressable
            key={member.userId}
            disabled={!owner || member.isYou}
            onPress={() => setSheet(member)}
            className={`flex-row items-center gap-3 p-4 rounded-2xl ${tone.card}`}
            style={shadow('sm')}>
            {member.isYou ? (
              <Avatar size={48} />
            ) : (
              <View className={`w-12 h-12 rounded-full items-center justify-center ${MEMBER_TINTS[index % MEMBER_TINTS.length]}`}>
                <Text className="font-headline-sm text-headline-sm text-on-surface">{initials(member.displayName) || '•'}</Text>
              </View>
            )}
            <View className="flex-1">
              <View className="flex-row items-center gap-1.5">
                <Text numberOfLines={1} className="font-label-lg text-[16px] text-on-surface flex-shrink">{member.displayName}</Text>
                {member.isYou && (
                  <View className={`px-1.5 rounded ${tone.freshBg}`}>
                    <Text className={`font-label-sm text-label-sm ${tone.freshText}`}>YOU</Text>
                  </View>
                )}
              </View>
              <Text className="font-body-sm text-body-sm text-on-surface-variant">
                {member.role === 'owner' ? 'Admin / Owner' : 'Co-Cook / Member'}
                {member.handle ? ` · @${member.handle}` : ''}
              </Text>
            </View>
            <View className="flex-row items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container-high dark:bg-surface-container-highest">
              <View className="w-2 h-2 rounded-full bg-primary" />
              <Text className="font-label-sm text-label-sm text-on-surface-variant">Active</Text>
            </View>
          </Pressable>
        ))}
      </View>

      <Pressable onPress={() => setSheet('invite')} className="h-14 rounded-full bg-primary flex-row items-center justify-center gap-2" style={shadow('primaryButton')}>
        <Icon name="send" className="text-[20px] text-on-primary" />
        <Text className="font-label-lg text-label-lg text-on-primary">+ Invite Household Member</Text>
      </Pressable>
      <Pressable onPress={share} className="flex-row items-center justify-center gap-1.5 -mt-2">
        <Icon name="qr_code_2" className="text-[16px] text-on-surface-variant" />
        <Text className="font-label-sm text-label-sm text-on-surface-variant">Or share the household join link directly</Text>
      </Pressable>

      <AccountRow onLeave={() => setSheet('leave')} />

      <Sheet visible={sheet === 'invite'} onClose={() => setSheet(undefined)} title="Invite to your household" subtitle="Share this code — it works for anyone with the app.">
        <View className="items-center gap-2 py-3 rounded-2xl bg-surface-container-low dark:bg-surface-container">
          <Text className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Invite code</Text>
          <Text selectable className="text-[36px] leading-[44px] font-bold tracking-[8px] text-primary">{household.inviteCode}</Text>
        </View>
        <SheetOption icon="share" label="Share invite" detail="Send the code and link by message" onPress={() => { setSheet(undefined); share(); }} />
        {owner && (
          <SheetOption
            icon="autorenew"
            label="Make a new code"
            detail="The old code stops working"
            onPress={async () => {
              const result = await newInviteCode();
              if (result.error) setError(result.error);
            }}
          />
        )}
      </Sheet>

      <Sheet visible={sheet === 'rename'} onClose={() => setSheet(undefined)} title="Rename household">
        <TextInput value={newName} onChangeText={setNewName} maxLength={60} autoFocus className="h-12 px-4 rounded-xl bg-surface-container-low dark:bg-surface-container font-body-lg text-body-lg text-on-surface" />
        <Pressable
          onPress={async () => {
            const result = await renameHousehold(newName);
            if (result.error) setError(result.error);
            setSheet(undefined);
          }}
          className="h-12 rounded-xl bg-primary items-center justify-center mt-2">
          <Text className="font-label-lg text-label-lg text-on-primary">Save</Text>
        </Pressable>
      </Sheet>

      <Sheet visible={sheet === 'leave'} onClose={() => setSheet(undefined)} title={`Leave ${household.name}?`} subtitle="You keep a copy of the pantry on this phone, but it stops syncing.">
        <SheetOption
          icon="logout"
          label="Leave household"
          destructive
          onPress={async () => {
            setSheet(undefined);
            const result = await leaveHousehold();
            if (result.error) setError(result.error);
          }}
        />
        <SheetOption icon="close" label="Stay" onPress={() => setSheet(undefined)} />
      </Sheet>

      <Sheet visible={typeof sheet === 'object'} onClose={() => setSheet(undefined)} title={typeof sheet === 'object' ? sheet.displayName : ''}>
        <SheetOption
          icon="person_remove"
          label="Remove from household"
          detail="They keep their own copy but stop syncing"
          destructive
          onPress={async () => {
            if (typeof sheet !== 'object') return;
            const result = await removeMember(sheet.userId);
            if (result.error) setError(result.error);
            setSheet(undefined);
          }}
        />
      </Sheet>
    </>
  );
}

/** Size and diet shape portions and recipe suggestions for everyone in the household. */
function HouseholdPreferences() {
  const shadow = useShadow();
  const settings = useSettings();
  const size = settings.householdSize;

  const toggleDiet = (value: DietId | 'none') => {
    if (value === 'none') return updateSettings({ diets: [] });
    updateSettings({ diets: settings.diets.includes(value) ? settings.diets.filter((entry) => entry !== value) : [...settings.diets, value] });
  };

  return (
    <>
      <View className="gap-space-sm">
        <View className="flex-row items-center justify-between">
          <Text className="font-headline-md text-headline-md text-on-surface">Household Setup & Scale</Text>
          <View className="px-2.5 py-0.5 rounded-full bg-surface-container-high dark:bg-surface-container">
            <Text className="font-label-sm text-label-sm text-on-surface-variant">Pace Engine</Text>
          </View>
        </View>
        <View className={`rounded-2xl p-4 gap-3 ${tone.card}`} style={shadow('sm')}>
          <View>
            <Text className="font-label-lg text-label-lg text-on-surface">Household Size</Text>
            <Text className="font-body-sm text-body-sm text-on-surface-variant">Calibrates portion sizes and recipe matches.</Text>
          </View>
          <View className={`flex-row items-center justify-between p-3 rounded-2xl ${tone.insetLow}`}>
            <View className="flex-row items-center gap-3">
              <View className="flex-row">
                {Array.from({ length: Math.min(size, 3) }).map((_, index) => (
                  <View key={index} className={`w-8 h-8 rounded-full items-center justify-center border-2 border-surface-container-lowest ${MEMBER_TINTS[index]}`} style={{ marginLeft: index ? -8 : 0 }}>
                    <Icon name="sentiment_satisfied" className="text-[18px] text-on-surface" />
                  </View>
                ))}
              </View>
              <Text className="font-headline-sm text-headline-sm text-on-surface">
                {size} {size === 1 ? 'Person' : 'People'}
              </Text>
            </View>
            <View className="flex-row items-center gap-2 p-1 rounded-full bg-surface-container-lowest dark:bg-surface-container-high">
              <Pressable accessibilityLabel="Fewer people" onPress={() => updateSettings({ householdSize: Math.max(1, size - 1) })} className="w-10 h-10 rounded-full bg-surface-container-low dark:bg-surface-container-highest items-center justify-center">
                <Icon name="remove" className="text-[20px] text-on-surface" />
              </Pressable>
              <Text className="font-label-lg text-label-lg text-on-surface w-5 text-center">{size}</Text>
              <Pressable accessibilityLabel="More people" onPress={() => updateSettings({ householdSize: Math.min(12, size + 1) })} className="w-10 h-10 rounded-full bg-primary items-center justify-center">
                <Icon name="add" className="text-[20px] text-on-primary" />
              </Pressable>
            </View>
          </View>
        </View>
      </View>

      <View className="gap-space-sm">
        <Text className="font-headline-md text-headline-md text-on-surface">Dietary Preferences & Allergies</Text>
        <Text className="font-body-sm text-body-sm text-on-surface-variant -mt-1">Recipes and nudges filter to match your household.</Text>
        <View className="flex-row flex-wrap gap-2">
          {DIETS.map((option) => {
            const selected = option.value === 'none' ? settings.diets.length === 0 : settings.diets.includes(option.value);
            return (
              <Pressable
                key={option.value}
                onPress={() => toggleDiet(option.value)}
                className={`flex-row items-center gap-1.5 h-9 px-3.5 rounded-full ${selected ? 'bg-primary' : 'bg-surface-container-low dark:bg-surface-container'}`}>
                {selected && <Icon name="check" className="text-[16px] text-on-primary" />}
                <Text className={`font-label-md text-label-md ${selected ? 'text-on-primary' : 'text-on-surface'}`}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </>
  );
}

function AccountRow({ onLeave }: { onLeave?: () => void }) {
  const shadow = useShadow();
  const { user } = useAccount();
  if (!user) return null;
  return (
    <View className={`rounded-2xl overflow-hidden ${tone.card}`} style={shadow('sm')}>
      <Row icon="account_circle" title={user.displayName || 'Your account'} detail={user.email ?? ''} />
      {onLeave && <Row icon="group_remove" title="Leave household" detail="Keep a local copy, stop syncing" onPress={onLeave} />}
      <Row icon="logout" title="Log Out" detail="Your pantry stays on this phone" destructive onPress={() => void signOut()} />
    </View>
  );
}

function Row({ icon, title, detail, onPress, destructive }: { icon: IconName; title: string; detail: string; onPress?: () => void; destructive?: boolean }) {
  return (
    <Pressable disabled={!onPress} onPress={onPress} className="flex-row items-center gap-3 p-4 border-b border-surface-container-low dark:border-outline-variant/40 active:bg-surface-container-low">
      <View className={`w-10 h-10 rounded-xl items-center justify-center ${destructive ? tone.coralTile : 'bg-surface-container-low dark:bg-surface-container-high'}`}>
        <Icon name={icon} className={`text-[20px] ${destructive ? 'text-error dark:text-tertiary' : 'text-on-surface'}`} />
      </View>
      <View className="flex-1">
        <Text className={`font-label-lg text-label-lg ${destructive ? 'text-error dark:text-tertiary' : 'text-on-surface'}`}>{title}</Text>
        {detail ? <Text className="font-body-sm text-body-sm text-on-surface-variant">{detail}</Text> : null}
      </View>
      {onPress && <Icon name="chevron_right" className="text-[20px] text-on-surface-variant" />}
    </Pressable>
  );
}
