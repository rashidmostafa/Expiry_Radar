import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import type { Urgency } from '@/domain/types';
import { tone } from '@/theme/tones';

/** Coral = today/tomorrow, amber = soon, green = fresh (DESIGN.md "Status Pills"). */
export const urgencyTone: Record<Urgency, { bg: string; text: string; accent: string; bar: string }> = {
  expired: { bg: tone.urgentBg, text: tone.urgentText, accent: 'text-error dark:text-tertiary', bar: 'bg-tertiary' },
  urgent: { bg: tone.urgentBg, text: tone.urgentText, accent: 'text-error dark:text-tertiary', bar: 'bg-tertiary' },
  soon: { bg: tone.soonBg, text: tone.soonText, accent: 'text-secondary', bar: 'bg-secondary-container' },
  fresh: { bg: tone.freshBg, text: tone.freshText, accent: 'text-primary', bar: 'bg-primary' },
};

export function UrgencyPill({
  urgency,
  label,
  dot,
  className = 'px-2',
  textClassName,
}: {
  urgency: Urgency;
  label: string;
  dot?: boolean;
  className?: string;
  /** Overrides the default on-*-fixed text shade (inventory uses the *-variant shades). */
  textClassName?: string;
}) {
  const colors = urgencyTone[urgency];
  return (
    <View className={`flex-row items-center gap-1 py-0.5 rounded-full shrink-0 ${colors.bg} ${className}`}>
      {dot && <View className="w-1.5 h-1.5 rounded-full bg-error dark:bg-tertiary" />}
      <Text className={`font-label-sm text-label-sm ${textClassName ?? `font-semibold ${colors.text}`}`}>{label}</Text>
    </View>
  );
}
