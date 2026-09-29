import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useShadow } from '@/theme/shadows';

/** Stitch settings bar: back chevron, title with a green "Preferences & Household" subtitle, avatar. */
export function SettingsHeader({ title, subtitle = 'Preferences & Household' }: { title: string; subtitle?: string }) {
  const insets = useSafeAreaInsets();
  const shadow = useShadow();
  return (
    <View className="bg-surface/85 dark:bg-surface/90 dark:border-b dark:border-outline-variant/60" style={[{ paddingTop: insets.top }, shadow('header')]}>
      <View className="h-16 px-space-md flex-row items-center justify-between">
        <View className="flex-row items-center gap-space-sm flex-1">
          <Pressable accessibilityLabel="Go back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/profile'))} className="w-11 h-11 -ml-2 rounded-full items-center justify-center">
            <Icon name="arrow_back_ios_new" className="text-[22px] text-on-surface" />
          </Pressable>
          <View className="flex-1">
            <Text numberOfLines={1} className="font-headline-md text-headline-md text-on-surface">{title}</Text>
            <Text className="font-label-sm text-label-sm text-primary leading-none">{subtitle}</Text>
          </View>
        </View>
        <Pressable accessibilityLabel="Profile" onPress={() => router.navigate('/profile')}>
          <Avatar size={32} />
        </Pressable>
      </View>
    </View>
  );
}
