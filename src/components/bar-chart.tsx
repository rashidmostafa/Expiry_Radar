import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';

export type BarSegment = { value: number; className: string };
export type Bar = { label: string; segments: BarSegment[] };

/**
 * Stacked bars (bottom segment first), as in the Stitch analytics cards.
 * Bars are tappable; the tallest gets a "Peak" flag.
 */
export function BarChart({
  bars,
  height = 150,
  selected,
  onSelect,
  peakLabel = 'Peak',
}: {
  bars: Bar[];
  height?: number;
  selected?: number;
  onSelect?: (index: number) => void;
  peakLabel?: string;
}) {
  const totals = bars.map((bar) => bar.segments.reduce((sum, segment) => sum + segment.value, 0));
  const max = Math.max(1, ...totals);
  const peak = totals.some((total) => total > 0) ? totals.indexOf(max) : -1;

  return (
    <View>
      <View className="flex-row items-end justify-between gap-1.5" style={{ height: height + 22 }}>
        {bars.map((bar, index) => {
          const total = totals[index];
          const dimmed = selected !== undefined && selected !== index;
          return (
            <Pressable
              key={`${bar.label}-${index}`}
              accessibilityLabel={`${bar.label}: ${total}`}
              onPress={() => onSelect?.(index)}
              className={`flex-1 items-center justify-end h-full ${dimmed ? 'opacity-50' : ''}`}>
              {index === peak && (
                <View className="px-1.5 py-0.5 rounded bg-primary mb-1">
                  <Text className="text-[9px] font-bold text-on-primary">{peakLabel}</Text>
                </View>
              )}
              <View className="w-full max-w-[28px] rounded-t-md overflow-hidden flex-col-reverse" style={{ height: total === 0 ? 4 : Math.max(6, (total / max) * height) }}>
                {total === 0 ? (
                  <View className="flex-1 bg-surface-container-highest" />
                ) : (
                  bar.segments.map((segment, i) => (segment.value > 0 ? <View key={i} className={segment.className} style={{ flex: segment.value }} /> : null))
                )}
              </View>
            </Pressable>
          );
        })}
      </View>
      <View className="flex-row justify-between gap-1.5 mt-1.5">
        {bars.map((bar, index) => (
          <Text key={`${bar.label}-${index}`} numberOfLines={1} className={`flex-1 text-center font-label-sm text-[10px] ${selected === index ? 'text-primary font-bold' : 'text-on-surface-variant'}`}>
            {bar.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

export function ChartLegend({ items }: { items: [dot: string, label: string][] }) {
  return (
    <View className="flex-row flex-wrap gap-x-4 gap-y-1">
      {items.map(([dot, label]) => (
        <View key={label} className="flex-row items-center gap-1.5">
          <View className={`w-2.5 h-2.5 rounded-sm ${dot}`} />
          <Text className="font-label-sm text-label-sm text-on-surface-variant">{label}</Text>
        </View>
      ))}
    </View>
  );
}
