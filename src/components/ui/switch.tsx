import { Pressable, View } from 'react-native';

const SIZES = {
  md: { track: 'w-10 h-6', knob: 'w-5 h-5 top-[2px]', off: 2, on: 18 },
  lg: { track: 'w-12 h-7', knob: 'w-6 h-6 top-[2px]', off: 2, on: 22 },
};

/** Stitch's toggle: primary track when on, white knob (md on item details, lg on add item). */
export function Switch({
  value,
  onValueChange,
  label,
  size = 'md',
}: {
  value: boolean;
  onValueChange: (value: boolean) => void;
  label: string;
  size?: keyof typeof SIZES;
}) {
  const s = SIZES[size];
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      onPress={() => onValueChange(!value)}
      hitSlop={8}
      className={`${s.track} rounded-full justify-center ${value ? 'bg-primary' : 'bg-surface-container-highest'}`}>
      <View
        className={`absolute ${s.knob} rounded-full bg-surface-container-lowest dark:bg-on-surface`}
        style={{ left: value ? s.on : s.off }}
      />
    </Pressable>
  );
}
