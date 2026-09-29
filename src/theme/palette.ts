/**
 * Color tokens ported 1:1 from the Stitch exports (home_dashboard / home_dashboard_dark_mode).
 * Tailwind classes resolve these through CSS variables, so the same markup renders both themes.
 */
import tokens from './palette.json';

export type ColorToken = keyof typeof tokens.light;
export type Palette = Record<ColorToken, string>;
export type ThemeName = 'light' | 'dark';

export const palettes: Record<ThemeName, Palette> = tokens;
export const colorTokens = Object.keys(tokens.light) as ColorToken[];

/** '#006a46' -> '0 106 70' (the channel format Tailwind's <alpha-value> expects). */
export function hexToChannels(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

/** Hex color with an alpha, for the few places (shadows, SVG) that take a raw color string. */
export function withAlpha(hex: string, alpha: number) {
  const [r, g, b] = hexToChannels(hex).split(' ');
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
