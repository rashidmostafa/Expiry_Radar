import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Text } from '@/components/ui/text';
import { useTheme } from '@/theme/theme-provider';

/** Radial gauge from the Stitch "Pantry Freshness Index" (r=19, stroke 4.5 in a 48 viewBox). */
export function ProgressRing({ percent, size = 56 }: { percent: number; size?: number }) {
  const { colors } = useTheme();
  const circumference = 2 * Math.PI * 19;
  const offset = circumference * (1 - Math.max(0, Math.min(100, percent)) / 100);
  return (
    <View className="relative items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 48 48" style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={24} cy={24} r={19} fill="none" stroke={colors['surface-container-highest']} strokeWidth={4.5} />
        <Circle
          cx={24}
          cy={24}
          r={19}
          fill="none"
          stroke={colors.primary}
          strokeWidth={4.5}
          strokeLinecap="round"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={offset}
        />
      </Svg>
      <Text className="absolute font-headline-sm text-[13px] font-bold text-on-surface">{Math.round(percent)}%</Text>
    </View>
  );
}
