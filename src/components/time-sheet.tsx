import { ScrollView } from 'react-native';

import { Sheet, SheetOption } from '@/components/ui/sheet';
import { formatClock } from '@/store/settings';

/** Pick a time of day (minutes after midnight) from half-hour slots. */
export function TimeSheet({
  visible,
  title,
  value,
  from = 0,
  to = 23 * 60 + 30,
  onChange,
  onClose,
}: {
  visible: boolean;
  title: string;
  value: number;
  from?: number;
  to?: number;
  onChange: (minutes: number) => void;
  onClose: () => void;
}) {
  const slots: number[] = [];
  for (let minutes = from; minutes <= to; minutes += 30) slots.push(minutes);
  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      <ScrollView style={{ maxHeight: 360 }} contentContainerStyle={{ gap: 8 }}>
        {slots.map((minutes) => (
          <SheetOption
            key={minutes}
            icon={minutes >= 6 * 60 && minutes < 18 * 60 ? 'light_mode' : 'dark_mode'}
            label={formatClock(minutes)}
            selected={minutes === value}
            onPress={() => {
              onChange(minutes);
              onClose();
            }}
          />
        ))}
      </ScrollView>
    </Sheet>
  );
}
