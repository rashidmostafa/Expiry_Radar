import { router, type Href } from 'expo-router';
import { TabTrigger, type TabTriggerSlotProps } from 'expo-router/ui';
import { forwardRef } from 'react';
import { Pressable, View, type View as ViewType } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useShadow } from '@/theme/shadows';

export type TabName = 'home' | 'inventory' | 'recipes' | 'profile';

export const tabs: { name: TabName; href: Href; label: string; icon: IconName }[] = [
  { name: 'home', href: '/', label: 'Home', icon: 'home' },
  { name: 'inventory', href: '/inventory', label: 'Inventory', icon: 'kitchen' },
  { name: 'recipes', href: '/recipes', label: 'Recipes', icon: 'restaurant' },
  { name: 'profile', href: '/profile', label: 'Profile', icon: 'person' },
];

type NavItemProps = Partial<TabTriggerSlotProps> & { label: string; icon: IconName; active?: boolean };

const NavItem = forwardRef<ViewType, NavItemProps>(function NavItem(
  { label, icon, active, isFocused, onPress, ...props },
  ref
) {
  const on = active ?? isFocused;
  return (
    <Pressable
      ref={ref}
      {...props}
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: on }}
      className="flex-col items-center justify-center min-w-[56px] min-h-[44px]">
      <Icon name={icon} className={`text-[24px] ${on ? 'text-primary' : 'text-on-surface-variant'}`} />
      <Text
        className={`font-label-sm text-label-sm mt-0.5 ${on ? 'text-primary font-semibold' : 'text-on-surface-variant'}`}>
        {label}
      </Text>
    </Pressable>
  );
});

function ScanButton() {
  const shadow = useShadow();
  return (
    <View className="relative -top-5 flex-col items-center">
      <Pressable
        accessibilityLabel="Scan groceries"
        onPress={() => router.push('/scan')}
        className="w-14 h-14 rounded-full bg-primary items-center justify-center active:scale-95"
        style={shadow('fab')}>
        <Icon name="barcode_scanner" className="text-[28px] text-on-primary" />
      </Pressable>
      <Text className="font-label-sm text-label-sm text-on-surface-variant mt-1">Scan</Text>
    </View>
  );
}

/**
 * Stitch bottom navigation with the raised center Scan FAB.
 * Inside the tab navigator items are TabTriggers; on pushed screens (item/recipe details)
 * pass `active` and they navigate back into the tabs.
 */
export function BottomNav({ active }: { active?: TabName }) {
  const insets = useSafeAreaInsets();
  const shadow = useShadow();
  const inTabs = active === undefined;

  const item = (index: number) => {
    const tab = tabs[index];
    return inTabs ? (
      <TabTrigger key={tab.name} name={tab.name} asChild>
        <NavItem label={tab.label} icon={tab.icon} />
      </TabTrigger>
    ) : (
      <NavItem
        key={tab.name}
        label={tab.label}
        icon={tab.icon}
        active={tab.name === active}
        onPress={() => router.dismissTo(tab.href)}
      />
    );
  };

  return (
    <View
      className="bg-surface/90 dark:border-t dark:border-outline-variant/60"
      style={[{ paddingBottom: insets.bottom }, shadow('nav')]}>
      <View className="w-full max-w-[480px] mx-auto relative flex-row items-center justify-around h-16 px-space-xs">
        {item(0)}
        {item(1)}
        <ScanButton />
        {item(2)}
        {item(3)}
      </View>
    </View>
  );
}
