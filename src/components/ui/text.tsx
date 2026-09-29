import { cssInterop } from 'nativewind';
import { forwardRef } from 'react';
import {
  Platform,
  Text as RNText,
  TextInput as RNTextInput,
  StyleSheet,
  type TextInputProps,
  type TextProps,
  type TextStyle,
} from 'react-native';

import { useTheme } from '@/theme/theme-provider';
import { jakartaFamilyFor } from '@/theme/fonts';
import { colorTokens } from '@/theme/palette';

const SIZE_CLASS = /(^|\s)text-(headline|body|label|xs|sm|base|lg|xl|\d?xl|\[\d)/;
const COLOR_CLASS = new RegExp(
  `(^|\\s)text-(${[...colorTokens, 'white', 'black', 'transparent', '\\[#'].join('|')})`
);

export function hasTextColorClass(className: string) {
  return COLOR_CLASS.test(className);
}

/**
 * Stitch sets `font-body-md text-on-surface` on <body> and relies on CSS inheritance; React Native
 * has none, so every Text gets those defaults unless its own classes override them.
 */
function withTextDefaults(className = '') {
  let defaults = 'font-sans';
  if (!SIZE_CLASS.test(className)) defaults += ' text-body-md';
  if (!hasTextColorClass(className)) defaults += ' text-on-surface';
  return `${defaults} ${className}`;
}

/** Native can't pick a font file by weight, so resolve Plus Jakarta Sans' face explicitly. */
function resolveNativeFont(style: TextProps['style']): TextStyle | TextProps['style'] {
  if (Platform.OS === 'web') return style;
  const flat = StyleSheet.flatten(style) ?? {};
  const family = typeof flat.fontFamily === 'string' ? flat.fontFamily : '';
  if (family && !family.startsWith('Plus Jakarta')) return flat;
  return { ...flat, fontFamily: jakartaFamilyFor(flat.fontWeight), fontWeight: undefined };
}

const FontText = forwardRef<RNText, TextProps>(function FontText({ style, ...props }, ref) {
  return <RNText ref={ref} {...props} style={resolveNativeFont(style)} />;
});
cssInterop(FontText, { className: 'style' });

export const Text = forwardRef<RNText, TextProps>(function Text({ className, ...props }, ref) {
  return <FontText ref={ref} className={withTextDefaults(className)} {...props} />;
});

const FontTextInput = forwardRef<RNTextInput, TextInputProps>(function FontTextInput(
  { style, ...props },
  ref
) {
  return <RNTextInput ref={ref} {...props} style={resolveNativeFont(style) as TextInputProps['style']} />;
});
cssInterop(FontTextInput, { className: 'style' });

export const TextInput = forwardRef<RNTextInput, TextInputProps>(function TextInput(
  { className, placeholderTextColor, ...props },
  ref
) {
  const { colors } = useTheme();
  return (
    <FontTextInput
      ref={ref}
      className={withTextDefaults(`outline-none ${className ?? ''}`)}
      placeholderTextColor={placeholderTextColor ?? colors.outline}
      {...props}
    />
  );
});
