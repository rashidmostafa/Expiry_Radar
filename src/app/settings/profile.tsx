import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { Avatar } from '@/components/avatar';
import { BottomNav } from '@/components/bottom-nav';
import { Icon, type IconName } from '@/components/ui/icon';
import { Text, TextInput } from '@/components/ui/text';
import { pickPhoto } from '@/services/photos';
import { updateProfile, useAccount } from '@/store/account';
import { updateSettings, useSettings } from '@/store/settings';
import { useShadow } from '@/theme/shadows';
import { tone } from '@/theme/tones';

const BIO_LIMIT = 150;

export default function EditProfileScreen() {
  const shadow = useShadow();
  const settings = useSettings();
  const { user } = useAccount();
  const [name, setName] = useState(settings.userName);
  const [handle, setHandle] = useState(settings.handle);
  const [bio, setBio] = useState(settings.bio);
  const [avatar, setAvatar] = useState(settings.avatar);
  const dirty = name !== settings.userName || handle !== settings.handle || bio !== settings.bio || avatar !== settings.avatar;

  const save = () => {
    const cleanHandle = handle.trim().replace(/^@/, '');
    updateSettings({ userName: name.trim(), handle: cleanHandle, bio: bio.trim(), avatar });
    // Housemates see your name and handle; the photo and bio stay on this phone.
    void updateProfile({ displayName: name.trim(), handle: cleanHandle });
    router.back();
  };

  const changePhoto = async () => {
    const uri = await pickPhoto('library');
    if (uri) setAvatar(uri);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-surface">
      <AppHeader page="User Profile" />
      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled" contentContainerClassName="w-full max-w-[480px] self-center px-margin pt-2 pb-8 gap-space-md">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => router.back()} className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-high dark:bg-surface-container">
            <Icon name="arrow_back" className="text-[18px] text-on-surface" />
            <Text className="font-label-md text-label-md text-on-surface">Back</Text>
          </Pressable>
          <Text className="font-headline-md text-headline-md text-on-surface">Edit Profile</Text>
          <Pressable disabled={!dirty} onPress={save} className={`px-4 py-1.5 rounded-full ${dirty ? 'bg-primary-fixed dark:bg-primary' : 'bg-surface-container-high dark:bg-surface-container'}`}>
            <Text className={`font-label-md text-label-md ${dirty ? 'text-on-primary-fixed dark:text-on-primary' : 'text-on-surface-variant'}`}>Save</Text>
          </Pressable>
        </View>

        <View className={`rounded-2xl p-6 items-center gap-2 ${tone.card}`} style={shadow('sm')}>
          <Pressable accessibilityLabel="Change photo" onPress={changePhoto} className="relative">
            <View className="rounded-full p-1 border-4 border-primary/60">
              <Avatar size={104} image={avatar} />
            </View>
            <View className="absolute bottom-1 right-1 w-9 h-9 rounded-full bg-primary items-center justify-center border-2 border-surface-container-lowest">
              <Icon name="photo_camera" className="text-[18px] text-on-primary" />
            </View>
          </Pressable>
          <Pressable onPress={changePhoto} className="flex-row items-center gap-1.5 px-4 py-2 rounded-full bg-surface-container-high dark:bg-surface-container-highest mt-2">
            <Icon name="cloud_upload" className="text-[18px] text-primary" />
            <Text className="font-label-md text-label-md text-primary">Change Photo</Text>
          </Pressable>
          <Text className="font-label-sm text-label-sm text-on-surface-variant">Stored only on this device</Text>
        </View>

        <Field icon="badge" label="Full name">
          <TextInput value={name} onChangeText={setName} placeholder="Your name" className="font-body-lg text-body-lg text-on-surface h-10 flex-1" />
          {name.length > 0 && (
            <Pressable accessibilityLabel="Clear name" onPress={() => setName('')}>
              <Icon name="cancel" className="text-[22px] text-on-surface-variant" />
            </Pressable>
          )}
        </Field>
        <Field icon="alternate_email" label="Display handle">
          <Text className="font-body-lg text-body-lg text-primary">@</Text>
          <TextInput value={handle} onChangeText={setHandle} autoCapitalize="none" placeholder="yourpantry" className="font-body-lg text-body-lg text-on-surface h-10 flex-1" />
        </Field>
        <Field icon="eco" label="Bio & household role" right={`${bio.length}/${BIO_LIMIT}`}>
          <TextInput
            value={bio}
            onChangeText={(text) => setBio(text.slice(0, BIO_LIMIT))}
            multiline
            placeholder="e.g. Batch-cooks on Sundays, hates wasting herbs"
            className="font-body-lg text-body-lg text-on-surface min-h-[72px] flex-1"
            textAlignVertical="top"
          />
        </Field>

        <Pressable
          disabled={!!user}
          onPress={() => router.push('/auth/login')}
          className="flex-row items-center gap-3 p-4 rounded-2xl bg-surface-container-low dark:bg-surface-container">
          <View className="w-10 h-10 rounded-full bg-surface-container-lowest dark:bg-surface-container-high items-center justify-center">
            <Icon name="shield_person" className="text-[20px] text-secondary" />
          </View>
          <View className="flex-1">
            <Text className="font-label-md text-label-md text-on-surface">{user ? 'Signed in with email' : 'Not signed in'}</Text>
            <Text className="font-body-sm text-body-sm text-on-surface-variant">{user?.email ?? 'Log in to share a pantry and read receipts'}</Text>
          </View>
          <View className={`px-2 py-0.5 rounded-full ${user ? tone.freshBg : 'bg-surface-container-high dark:bg-surface-container-highest'}`}>
            <Text className={`font-label-sm text-label-sm ${user ? tone.freshText : 'text-primary'}`}>{user ? 'Linked' : 'Log in'}</Text>
          </View>
        </Pressable>

        <Pressable disabled={!dirty} onPress={save} className={`h-14 rounded-full bg-primary flex-row items-center justify-center gap-2 mt-2 ${dirty ? '' : 'opacity-50'}`} style={shadow('primaryButton')}>
          <Icon name="check" className="text-[20px] text-on-primary" />
          <Text className="font-label-lg text-label-lg text-on-primary">Save Changes</Text>
        </Pressable>
        <Pressable onPress={() => router.back()} className="items-center py-2">
          <Text className="font-label-md text-label-md text-on-surface-variant">Discard Changes</Text>
        </Pressable>
      </ScrollView>
      <BottomNav active="profile" />
    </KeyboardAvoidingView>
  );
}

function Field({ icon, label, right, children }: { icon: IconName; label: string; right?: string; children: React.ReactNode }) {
  const shadow = useShadow();
  return (
    <View className={`rounded-2xl p-4 gap-1 ${tone.card}`} style={shadow('sm')}>
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-1.5">
          <Icon name={icon} className="text-[16px] text-on-surface-variant" />
          <Text className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">{label}</Text>
        </View>
        {right && <Text className="font-label-sm text-label-sm text-on-surface-variant">{right}</Text>}
      </View>
      <View className="flex-row items-center gap-2">{children}</View>
    </View>
  );
}

