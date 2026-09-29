import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { Logo } from '@/components/logo';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useNudges } from '@/store/use-nudges';
import { useShadow } from '@/theme/shadows';

/**
 * Stitch app bar: logo, "Expiry Radar" wordmark with the page name underneath, bell and avatar.
 * The mock iOS status bar in the exports is replaced by the real safe-area inset.
 */
export function AppHeader({ page, right }: { page: string; right?: ReactNode }) {
  const insets = useSafeAreaInsets();
  const shadow = useShadow();
  return (
    <View
      className="z-50 bg-surface/85 dark:bg-surface/90 dark:border-b dark:border-outline-variant/60"
      style={[{ paddingTop: insets.top }, shadow('header')]}>
      <View className="h-16 px-space-md flex-row items-center justify-between">
        <View className="flex-row items-center gap-space-sm">
          <Logo size={32} />
          <View className="flex-col">
            <Text className="font-headline-sm text-headline-sm text-primary tracking-tight">Expiry Radar</Text>
            <Text className="font-label-sm text-label-sm text-on-surface-variant leading-none">{page}</Text>
          </View>
        </View>
        <View className="flex-row items-center gap-space-xs">
          {right ?? (
            <>
              <BellButton />
              <Pressable
                accessibilityLabel="Profile"
                onPress={() => router.navigate('/profile')}
                className="w-11 h-11 rounded-full items-center justify-center p-0.5">
                <Avatar size={32} />
              </Pressable>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

/** Back-arrow title bar used by focused flows (Add Item). */
export function FlowHeader({ title, right }: { title: string; right?: ReactNode }) {
  const insets = useSafeAreaInsets();
  const shadow = useShadow();
  return (
    <View
      className="z-50 bg-surface/85 dark:bg-surface/90 dark:border-b dark:border-outline-variant/60"
      style={[{ paddingTop: insets.top }, shadow('header')]}>
      <View className="h-14 px-space-md flex-row items-center justify-between">
        <View className="flex-row items-center gap-space-sm flex-1">
          <Pressable
            accessibilityLabel="Go back"
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            className="w-11 h-11 -ml-2 rounded-full items-center justify-center active:bg-surface-container">
            <Icon name="arrow_back" className="text-[24px] text-on-surface" />
          </Pressable>
          <Text numberOfLines={1} className="font-headline-sm text-headline-sm text-on-surface tracking-tight flex-1">
            {title}
          </Text>
        </View>
        <View className="flex-row items-center gap-space-xs">{right}</View>
      </View>
    </View>
  );
}

function BellButton() {
  const { unseenIds } = useNudges();
  return (
    <Pressable
      accessibilityLabel={unseenIds.length ? `Smart nudges, ${unseenIds.length} new` : 'Smart nudges'}
      onPress={() => router.push('/nudges')}
      className="w-11 h-11 rounded-full items-center justify-center">
      <Icon name="notifications" className="text-[22px] text-on-surface-variant" />
      {unseenIds.length > 0 && (
        <View className="absolute top-2.5 right-3 w-2.5 h-2.5 rounded-full bg-secondary-container dark:bg-secondary border-2 border-surface" />
      )}
    </Pressable>
  );
}
