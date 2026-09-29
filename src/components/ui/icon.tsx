import { cssInterop } from 'nativewind';
import { Text, type TextProps } from 'react-native';

import { ICON_FONT, ICON_FONT_FILLED } from '@/theme/fonts';

import glyphmap from './material-symbols-glyphmap.json';
import { hasTextColorClass } from './text';

export type IconName = keyof typeof glyphmap;

const SIZE_CLASS = /(^|\s)text-\[\d/;

const Glyph = (props: TextProps) => <Text {...props} />;
cssInterop(Glyph, { className: 'style' });

type IconProps = Omit<TextProps, 'children'> & {
  name: IconName;
  /** Stitch's `font-variation-settings: 'FILL' 1`. */
  filled?: boolean;
};

/**
 * Material Symbols Outlined, rendered by codepoint so it works without font ligatures.
 * Size and color come from classes exactly as in the Stitch markup: `text-[22px] text-primary`.
 */
export function Icon({ name, filled, className = '', style, ...props }: IconProps) {
  const size = SIZE_CLASS.test(className) ? '' : 'text-[24px] ';
  const color = hasTextColorClass(className) ? '' : 'text-on-surface ';
  return (
    <Glyph
      accessibilityElementsHidden
      importantForAccessibility="no"
      selectable={false}
      {...props}
      className={`${size}${color}leading-none ${className}`}
      style={[{ fontFamily: filled ? ICON_FONT_FILLED : ICON_FONT, fontWeight: 'normal' }, style]}>
      {String.fromCodePoint(glyphmap[name])}
    </Glyph>
  );
}
