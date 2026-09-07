// Expenso — dark-mode-first palette. One file, one source of truth: every
// screen imports from here instead of hardcoding hex values, so a re-theme
// later is a one-file change.
export const colors = {
  background: "#0A0A0A",
  surface: "#161616",
  surfaceRaised: "#1F1F1F",
  border: "#2A2A2A",

  textPrimary: "#FFFFFF",
  textSecondary: "#B5B5B5",
  textMuted: "#808080",

  accent: "#00E676", // neon green — primary actions, positive values
  accentMuted: "#0A5C33",
  danger: "#FF5252", // overspending, unpaid, destructive actions
  dangerMuted: "#4A1F1F",
  warning: "#FFB300",

  // Category color palette offered when creating/editing a category.
  categoryPalette: [
    "#00E676",
    "#40C4FF",
    "#FFB300",
    "#FF4081",
    "#7C4DFF",
    "#FF5252",
    "#69F0AE",
    "#FFD740",
    "#B388FF",
    "#9E9E9E",
  ],
} as const;

export type ThemeColors = typeof colors;
