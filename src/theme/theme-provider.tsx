import { colorScheme as nativewindScheme, vars } from 'nativewind';
import { createContext, useContext, useEffect, useMemo, type PropsWithChildren } from 'react';
import { Platform, useColorScheme, View } from 'react-native';

import { useSettings, updateSettings, type ThemePreference } from '@/store/settings';

import { colorTokens, hexToChannels, palettes, type Palette, type ThemeName } from './palette';

type ThemeContextValue = {
  scheme: ThemeName;
  colors: Palette;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function cssVariables(scheme: ThemeName) {
  const palette = palettes[scheme];
  return Object.fromEntries(
    colorTokens.map((token) => [`--color-${token}`, hexToChannels(palette[token])])
  );
}

const variableStyles = {
  light: vars(cssVariables('light')),
  dark: vars(cssVariables('dark')),
};

export function ThemeProvider({ children }: PropsWithChildren) {
  const system = useColorScheme();
  const { theme: preference } = useSettings();
  const scheme: ThemeName =
    preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;

  useEffect(() => {
    // Drives `dark:` variants (dark-only borders/tints from the Stitch dark exports).
    nativewindScheme.set(scheme);
    if (Platform.OS === 'web') {
      // Portals (modals) render outside the root view on web, so expose the variables globally too.
      const root = document.documentElement;
      for (const [name, value] of Object.entries(cssVariables(scheme))) {
        root.style.setProperty(name, value);
      }
      root.style.colorScheme = scheme;
      document.body.style.backgroundColor = palettes[scheme].surface;
    }
  }, [scheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      scheme,
      colors: palettes[scheme],
      preference,
      setPreference: (theme) => updateSettings({ theme }),
    }),
    [scheme, preference]
  );

  return (
    <ThemeContext.Provider value={value}>
      <View style={[{ flex: 1 }, variableStyles[scheme]]}>{children}</View>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside <ThemeProvider>');
  return context;
}
