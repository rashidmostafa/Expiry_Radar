import { useTheme } from './theme-provider';

/**
 * Stitch's arbitrary shadows (`shadow-[0px_2px_8px_rgba(...)]`) paired with what the matching
 * *_dark_mode export uses. NativeWind can't translate multi-part box-shadows on native, but
 * React Native's `boxShadow` style accepts the CSS strings directly.
 */
const shadows = {
  sm: ['0px 1px 2px rgba(0, 0, 0, 0.05)', '0px 1px 2px rgba(0, 0, 0, 0.05)'],
  statCard: ['0px 2px 8px rgba(43, 43, 43, 0.03)', '0px 1px 2px rgba(0, 0, 0, 0.05)'],
  card: [
    '0px 2px 8px rgba(43, 43, 43, 0.04)',
    '0px 4px 6px -1px rgba(0, 0, 0, 0.1), 0px 2px 4px -2px rgba(0, 0, 0, 0.1)',
  ],
  hero: [
    '0px 4px 16px rgba(43, 43, 43, 0.05)',
    '0px 10px 15px -3px rgba(0, 0, 0, 0.1), 0px 4px 6px -4px rgba(0, 0, 0, 0.1)',
  ],
  sheet: ['0px 8px 24px rgba(43, 43, 43, 0.08)', '0px 8px 24px -4px rgba(0, 0, 0, 0.45)'],
  primaryButton: ['0px 4px 12px rgba(0, 106, 70, 0.2)', '0px 4px 16px rgba(76, 191, 138, 0.25)'],
  fab: ['0px 8px 20px rgba(0, 106, 70, 0.35)', '0px 8px 20px rgba(76, 191, 138, 0.35)'],
  header: ['0px 1px 8px rgba(0, 0, 0, 0.04)', '0px 1px 8px rgba(0, 0, 0, 0.3)'],
  nav: ['0px -4px 16px rgba(0, 0, 0, 0.04)', '0px -4px 16px rgba(0, 0, 0, 0.3)'],
} as const;

export type ShadowName = keyof typeof shadows;

export function useShadow() {
  const { scheme } = useTheme();
  // Plain `{ boxShadow }` so it fits View, Text and TextInput style props alike.
  return (name: ShadowName): { boxShadow: string } => ({
    boxShadow: shadows[name][scheme === 'dark' ? 1 : 0],
  });
}
