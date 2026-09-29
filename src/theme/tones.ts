/**
 * Surface recipes that differ between the Stitch light and dark exports beyond a token swap.
 * Light markup is kept verbatim; the `dark:` half comes from the matching *_dark_mode screen.
 */
export const tone = {
  /** White card on cream (light) / tonal card with hairline border (dark). */
  card: 'bg-surface-container-lowest dark:bg-surface-container dark:border dark:border-outline-variant/60',
  /** Recessed panel inside a card. */
  inset: 'bg-surface-container dark:bg-surface-container-low dark:border dark:border-outline-variant/50',
  insetLow:
    'bg-surface-container-low dark:bg-surface-container-low dark:border dark:border-outline-variant/50',
  /** Hairline divider that only shows in dark mode. */
  darkDivider: 'dark:border-t dark:border-outline-variant/40',

  urgentBg: 'bg-error-container dark:bg-[#3A1813] dark:border dark:border-[#5A251E]',
  urgentText: 'text-on-error-container dark:text-tertiary',
  soonBg: 'bg-secondary-fixed dark:bg-[#3B2312] dark:border dark:border-[#5D361B]',
  soonText: 'text-on-secondary-fixed dark:text-secondary',
  freshBg: 'bg-primary-fixed dark:bg-[#1C382B] dark:border dark:border-[#2B5440]',
  freshText: 'text-on-primary-fixed dark:text-primary',

  coralTile: 'bg-tertiary-fixed dark:bg-[#3A1813] dark:border dark:border-[#5A251E]',
  amberTile: 'bg-secondary-fixed dark:bg-[#3B2312] dark:border dark:border-[#5D361B]',
  greenTint: 'bg-primary/10 dark:bg-[#1C382B] dark:border dark:border-[#2B5440]',
} as const;
