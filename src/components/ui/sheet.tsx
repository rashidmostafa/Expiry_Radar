import type { ReactNode } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useShadow } from '@/theme/shadows';

/** Bottom sheet (DESIGN.md Level 2 surface, 24px top corners). Works on web where Alert doesn't. */
export function Sheet({
  visible,
  onClose,
  title,
  subtitle,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const shadow = useShadow();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable accessibilityLabel="Close" onPress={onClose} className="flex-1 bg-black/40" />
      <View
        className="bg-surface-container-lowest dark:bg-surface-container-high rounded-t-3xl px-margin pt-3 w-full max-w-[480px] self-center"
        style={[{ paddingBottom: insets.bottom + 16 }, shadow('sheet')]}>
        <View className="self-center w-10 h-1 rounded-full bg-outline-variant mb-4" />
        <Text className="font-headline-sm text-headline-sm text-on-surface">{title}</Text>
        {subtitle && <Text className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">{subtitle}</Text>}
        <View className="mt-4 gap-2">{children}</View>
      </View>
    </Modal>
  );
}

export function SheetOption({
  icon,
  label,
  detail,
  onPress,
  destructive,
  selected,
}: {
  icon: IconName;
  label: string;
  detail?: string;
  onPress: () => void;
  destructive?: boolean;
  selected?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center gap-3 p-3 rounded-xl active:scale-[0.98] ${
        selected ? 'bg-primary-fixed/50 dark:bg-[#1C382B]' : 'bg-surface-container-low dark:bg-surface-container'
      }`}>
      <View
        className={`w-10 h-10 rounded-full items-center justify-center ${
          destructive ? 'bg-error-container dark:bg-[#3A1813]' : 'bg-surface-container-lowest dark:bg-surface-container-highest'
        }`}>
        <Icon name={icon} className={`text-[20px] ${destructive ? 'text-error dark:text-tertiary' : 'text-primary'}`} />
      </View>
      <View className="flex-1">
        <Text className={`font-label-lg text-label-lg ${destructive ? 'text-error dark:text-tertiary' : 'text-on-surface'}`}>{label}</Text>
        {detail && <Text className="font-body-sm text-body-sm text-on-surface-variant">{detail}</Text>}
      </View>
      {selected && <Icon name="check" className="text-[20px] text-primary" />}
    </Pressable>
  );
}
