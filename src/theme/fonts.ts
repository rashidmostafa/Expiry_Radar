import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { Asset } from 'expo-asset';
import { useFonts } from 'expo-font';
import { useEffect } from 'react';
import { Platform } from 'react-native';

export const ICON_FONT = 'MaterialSymbolsOutlined';
export const ICON_FONT_FILLED = 'MaterialSymbolsOutlinedFill';

/** Web: CSS family name with real weights. Native: one registered family per weight. */
export const WEB_FONT_FAMILY = 'Plus Jakarta Sans';

const jakartaFaces = {
  400: ['PlusJakartaSans_400Regular', PlusJakartaSans_400Regular],
  500: ['PlusJakartaSans_500Medium', PlusJakartaSans_500Medium],
  600: ['PlusJakartaSans_600SemiBold', PlusJakartaSans_600SemiBold],
  700: ['PlusJakartaSans_700Bold', PlusJakartaSans_700Bold],
  800: ['PlusJakartaSans_800ExtraBold', PlusJakartaSans_800ExtraBold],
} as const;

type Weight = keyof typeof jakartaFaces;

const iconFonts = {
  [ICON_FONT]: require('@/assets/fonts/MaterialSymbolsOutlined-Fill0.ttf'),
  [ICON_FONT_FILLED]: require('@/assets/fonts/MaterialSymbolsOutlined-Fill1.ttf'),
};

/** Maps a CSS font-weight to the Plus Jakarta Sans face registered on native. */
export function jakartaFamilyFor(fontWeight: string | number | undefined) {
  const numeric =
    fontWeight === 'bold' ? 700 : fontWeight === undefined || fontWeight === 'normal' ? 400 : Number(fontWeight);
  const clamped = Math.min(800, Math.max(400, Math.round((numeric || 400) / 100) * 100)) as Weight;
  return jakartaFaces[clamped][0];
}

function injectWebFontFaces() {
  const id = 'plus-jakarta-font-faces';
  if (document.getElementById(id)) return;
  const css = Object.entries(jakartaFaces)
    .map(
      ([weight, [, module]]) =>
        `@font-face{font-family:'${WEB_FONT_FAMILY}';font-weight:${weight};font-style:normal;font-display:swap;src:url('${Asset.fromModule(module).uri}') format('truetype');}`
    )
    .join('\n');
  const style = document.createElement('style');
  style.id = id;
  style.textContent = css;
  document.head.appendChild(style);
}

export function useAppFonts() {
  useEffect(() => {
    if (Platform.OS === 'web') injectWebFontFaces();
  }, []);

  const native =
    Platform.OS === 'web'
      ? {}
      : Object.fromEntries(Object.values(jakartaFaces).map(([name, module]) => [name, module]));

  return useFonts({ ...native, ...iconFonts });
}
