// Expenso — Platinum Minimalist & Crisp White palette.
// Unified, high-contrast, distraction-free neutral theme inspired by
// Apple & Linear design systems.

export const colors = {
  background: "#09090B",
  surface: "#141417",
  surfaceRaised: "#1C1C21",
  border: "#27272A",
  borderLight: "rgba(255, 255, 255, 0.12)",

  textPrimary: "#FFFFFF",
  textSecondary: "#A1A1AA",
  textMuted: "#71717A",

  // Primary High-Contrast Accent (Crisp White / Platinum)
  accent: "#FFFFFF",
  accentMuted: "rgba(255, 255, 255, 0.12)",
  accentForeground: "#09090B",

  // Unified Neutral Icon Tokens
  iconNeutral: "#E4E4E7",
  iconBg: "rgba(255, 255, 255, 0.06)",
  iconBorder: "rgba(255, 255, 255, 0.09)",

  // Subdued Functional Semantic Colors (Only for alerts & critical indicators)
  danger: "#EF4444",
  dangerMuted: "rgba(239, 68, 68, 0.15)",
  warning: "#F59E0B",
  warningMuted: "rgba(245, 158, 11, 0.15)",
  success: "#10B981",
  successMuted: "rgba(16, 185, 129, 0.12)",

  // Neutral Monochromatic Palette for Categories & Charts
  categoryPalette: [
    "#FFFFFF",
    "#F4F4F5",
    "#E4E4E7",
    "#D4D4D8",
    "#A1A1AA",
    "#71717A",
    "#52525B",
    "#3F3F46",
    "#E2E8F0",
    "#94A3B8",
  ],
} as const;

export type ThemeColors = typeof colors;
