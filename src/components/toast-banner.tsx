import { Pressable, View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useShadow } from '@/theme/shadows';

type Props = {
  icon: IconName;
  title: string;
  body: React.ReactNode;
  footnote?: string;
  onUndo?: () => void;
  onDismiss: () => void;
  action?: { label: string; onPress: () => void };
};

/** "Pantry updated!" banner from updated_pantry_inventory — positive reinforcement with undo. */
export function ToastBanner({ icon, title, body, footnote, onUndo, onDismiss, action }: Props) {
  const shadow = useShadow();
  return (
    <View
      className="bg-primary-fixed dark:bg-[#1C382B] dark:border dark:border-[#2B5440] rounded-xl p-space-md relative overflow-hidden flex-col gap-space-sm"
      style={shadow('sm')}>
      <View className="flex-row items-start justify-between gap-space-sm">
        <View className="flex-row items-start gap-space-sm flex-1">
          <View className="w-8 h-8 rounded-full bg-primary items-center justify-center shrink-0 mt-0.5">
            <Icon name={icon} filled className="text-[18px] text-on-primary" />
          </View>
          <View className="flex-1">
            <Text className="font-headline-sm text-headline-sm tracking-tight text-on-primary-fixed dark:text-on-surface leading-snug">
              {title}
            </Text>
            <Text className="font-body-sm text-body-sm text-on-primary-fixed-variant dark:text-on-surface-variant">{body}</Text>
          </View>
        </View>
        <Pressable accessibilityLabel="Dismiss" onPress={onDismiss} className="p-1">
          <Icon name="close" className="text-[18px] text-on-primary-fixed-variant dark:text-on-surface-variant" />
        </Pressable>
      </View>
      {(footnote || onUndo || action) && (
        <View className="flex-row items-center justify-between pt-space-xs">
          <View className="flex-row items-center gap-1.5">
            {footnote && (
              <>
                <Icon name="eco" className="text-[15px] text-on-primary-fixed-variant dark:text-primary" />
                <Text className="font-label-sm text-label-sm text-on-primary-fixed-variant dark:text-primary">{footnote}</Text>
              </>
            )}
          </View>
          <View className="flex-row items-center gap-space-xs">
            {action && (
              <Pressable
                onPress={action.onPress}
                className="px-2.5 py-1 rounded-full bg-surface-container-lowest dark:bg-surface-container"
                style={shadow('sm')}>
                <Text className="font-label-sm text-label-sm text-primary">{action.label}</Text>
              </Pressable>
            )}
            {onUndo && (
              <Pressable onPress={onUndo} className="px-2.5 py-1 rounded-full bg-primary/10 dark:bg-primary/20">
                <Text className="font-label-sm text-label-sm text-on-primary-fixed dark:text-primary">Undo</Text>
              </Pressable>
            )}
          </View>
        </View>
      )}
    </View>
  );
}
