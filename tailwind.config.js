const { light } = require('./src/theme/palette.json');

// Every color token resolves through a CSS variable set by <ThemeProvider>, so Stitch's light
// markup renders the dark palette too. Channels format keeps opacity modifiers (bg-primary/10) working.
const colors = Object.fromEntries(
  Object.keys(light).map((token) => [token, `rgb(var(--color-${token}) / <alpha-value>)`])
);

// Stitch's type scale (fresh_pantry_warmth/DESIGN.md). Every font-* utility is Plus Jakarta Sans;
// on native <Text> swaps in the face registered for the resolved weight.
const fontSize = {
  'headline-xl': ['36px', { lineHeight: '44px', letterSpacing: '-0.02em', fontWeight: '700' }],
  'headline-xl-mobile': ['28px', { lineHeight: '36px', letterSpacing: '-0.01em', fontWeight: '700' }],
  'headline-lg': ['24px', { lineHeight: '32px', letterSpacing: '-0.01em', fontWeight: '600' }],
  'headline-md': ['20px', { lineHeight: '28px', fontWeight: '600' }],
  'headline-sm': ['18px', { lineHeight: '24px', fontWeight: '600' }],
  'body-lg': ['16px', { lineHeight: '24px', fontWeight: '400' }],
  'body-md': ['14px', { lineHeight: '20px', fontWeight: '400' }],
  'body-sm': ['13px', { lineHeight: '18px', fontWeight: '400' }],
  'label-lg': ['14px', { lineHeight: '20px', fontWeight: '600' }],
  'label-md': ['12px', { lineHeight: '16px', letterSpacing: '0.02em', fontWeight: '600' }],
  'label-sm': ['11px', { lineHeight: '14px', letterSpacing: '0.04em', fontWeight: '600' }],
};

const fontFamily = Object.fromEntries(
  ['sans', ...Object.keys(fontSize)].map((key) => [key, ['Plus Jakarta Sans', 'system-ui', 'sans-serif']])
);

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors,
      fontSize,
      fontFamily,
      borderRadius: { DEFAULT: '0.25rem', lg: '0.5rem', xl: '0.75rem', full: '9999px' },
      spacing: {
        'space-xs': '0.25rem',
        'space-sm': '0.5rem',
        'space-md': '1rem',
        'space-lg': '1.5rem',
        'space-xl': '2rem',
        gutter: '1rem',
        margin: '1.25rem',
      },
    },
  },
  plugins: [],
};
