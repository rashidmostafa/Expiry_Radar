import { Pressable, View } from 'react-native';

import { Sheet } from '@/components/ui/sheet';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { addDays, daysBetween, formatRelativeDay, today } from '@/domain/dates';

/** [future label, past label, days] */
const QUICK = [
  ['Today', 'Today', 0],
  ['Tomorrow', 'Yesterday', 1],
  ['In 3 days', '3 days ago', 3],
  ['In 1 week', '1 week ago', 7],
  ['In 2 weeks', '2 weeks ago', 14],
  ['In 1 month', '1 month ago', 30],
] as const;

/** Lightweight date picker that behaves the same on iOS, Android and web. */
export function DateSheet({
  visible,
  title,
  value,
  onChange,
  onClose,
  past,
}: {
  visible: boolean;
  title: string;
  value: string;
  onChange: (iso: string) => void;
  onClose: () => void;
  /** Quick picks count backwards (purchase dates). */
  past?: boolean;
}) {
  const now = today();
  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      <View className="flex-row items-center justify-between p-2 rounded-2xl bg-surface-container-low dark:bg-surface-container">
        <Stepper icon="remove" label="Previous day" onPress={() => onChange(addDays(value, -1))} />
        <Text className="font-headline-sm text-headline-sm text-on-surface">{formatRelativeDay(value)}</Text>
        <Stepper icon="add" label="Next day" onPress={() => onChange(addDays(value, 1))} />
      </View>
      <View className="flex-row flex-wrap gap-2 pt-1">
        {QUICK.map(([future, before, offset]) => {
          const iso = addDays(now, past ? -offset : offset);
          const text = past ? before : future;
          const selected = daysBetween(iso, value) === 0;
          return (
            <Pressable
              key={offset}
              onPress={() => onChange(iso)}
              className={`h-9 px-3.5 rounded-full items-center justify-center ${selected ? 'bg-primary' : 'bg-surface-container-low dark:bg-surface-container'}`}>
              <Text className={`font-label-md text-label-md ${selected ? 'text-on-primary' : 'text-on-surface'}`}>{text}</Text>
            </Pressable>
          );
        })}
      </View>
      <Pressable onPress={onClose} className="mt-2 h-12 rounded-xl bg-primary items-center justify-center active:scale-[0.98]">
        <Text className="font-label-lg text-label-lg text-on-primary">Done</Text>
      </Pressable>
    </Sheet>
  );
}

function Stepper({ icon, label, onPress }: { icon: 'add' | 'remove'; label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityLabel={label}
      onPress={onPress}
      className="w-10 h-10 rounded-lg bg-surface-container-lowest dark:bg-surface-container-highest items-center justify-center active:scale-90">
      <Icon name={icon} className="text-[18px] text-on-surface" />
    </Pressable>
  );
}
