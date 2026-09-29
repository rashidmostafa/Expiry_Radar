import { Pressable, View } from 'react-native';

import { Icon } from '@/components/ui/icon';

/**
 * accent-primary checkbox from the Stitch recipe checklist.
 * Without `onChange` it renders as a plain indicator so a surrounding Pressable owns the tap.
 */
export function Checkbox({
  checked,
  onChange,
  label,
  size = 20,
}: {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  label: string;
  size?: 16 | 20;
}) {
  const className = `rounded items-center justify-center ${checked ? 'bg-primary' : 'border-[1.5px] border-outline bg-surface-container-lowest dark:bg-surface-container-low'}`;
  const mark = checked && <Icon name="check" className={`${size === 16 ? 'text-[13px]' : 'text-[16px]'} text-on-primary`} />;
  if (!onChange) {
    return (
      <View className={className} style={{ width: size, height: size }}>
        {mark}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked }}
      hitSlop={10}
      onPress={() => onChange(!checked)}
      className={className}
      style={{ width: size, height: size }}>
      {mark}
    </Pressable>
  );
}
