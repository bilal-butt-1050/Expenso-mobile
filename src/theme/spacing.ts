// Expenso — Spacing & Radius tokens.
// Generous, breathable spacing for a premium feel.
export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 20,
  xl: 28,
  xxl: 40,
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  pill: 999,
} as const;

/** Bottom tab dock geometry (navigation/dock.ts is the only reader). */
export const dock = {
  /** Icons plus labels, above the bottom padding. */
  contentHeight: 62,
  /** Gap kept above the device's bottom inset (home indicator / gesture bar). */
  insetGap: 8,
  /** Bottom padding floor on devices that report no inset. */
  minBottomIos: 28,
  minBottomAndroid: 16,
} as const;

export const size = {
  /** Minimum hit area for anything tappable. */
  minTouch: 44,
  /** Floating action button diameter. */
  fab: 56,
} as const;
