// Expenso — Premium Indigo FinTech Theme
// Deep navy/slate (dark) or soft slate on white (light), with electric indigo accents.
import { activeScheme } from "./appearance";

/** Category and chart colours: the same in both themes. */
const categoryPalette = [
  "#6366F1", // Indigo
  "#8B5CF6", // Violet
  "#EC4899", // Pink
  "#F43F5E", // Rose
  "#F59E0B", // Amber
  "#10B981", // Emerald
  "#0EA5E9", // Sky
  "#3B82F6", // Blue
  "#14B8A6", // Teal
  "#84CC16", // Lime
];

export const darkColors = {
  background: "#0B0F19",
  surface: "#111827",
  surfaceRaised: "#1F2937",
  border: "#374151",
  borderLight: "rgba(255, 255, 255, 0.08)",

  textPrimary: "#F9FAFB",
  textSecondary: "#9CA3AF",
  textMuted: "#6B7280",

  // Primary High-Contrast Accent (Electric Indigo)
  accent: "#6366F1",
  accentMuted: "rgba(99, 102, 241, 0.15)",
  accentForeground: "#FFFFFF",
  // Accent-coloured *text* (links, text buttons). `accent` as text fails 4.5:1 on our surfaces.
  accentText: "#818CF8",
  // Filled primary controls (primary buttons, the FAB, the Home button): one shade deeper than
  // `accent`, so their white labels and icons read clearly (B5, D-33).
  accentFill: "#4F46E5",
  // The flash on a row just added or edited (D-58).
  highlight: "rgba(99, 102, 241, 0.22)",
  // Dims the screen behind every sheet and dialog (W14): one value for all of them.
  scrim: "rgba(0, 0, 0, 0.7)",

  // shadowColor for floating elements; use through `elevation.floating`, never directly.
  shadow: "#000000",

  // Unified Neutral Icon Tokens
  iconNeutral: "#E5E7EB",
  iconBg: "rgba(255, 255, 255, 0.05)",
  iconBorder: "rgba(255, 255, 255, 0.1)",

  // Subdued Functional Semantic Colors
  danger: "#EF4444",
  dangerMuted: "rgba(239, 68, 68, 0.15)",
  // Filled destructive buttons (a confirm dialog's Delete): white reads on it.
  dangerStrong: "#DC2626",
  warning: "#F59E0B",
  warningMuted: "rgba(245, 158, 11, 0.15)",
  success: "#10B981",
  successMuted: "rgba(16, 185, 129, 0.15)",

  // Loans: one colour per direction, everywhere (D-59, W4). Never green/red, which mean
  // income/spending.
  lent: "#60A5FA",
  lentMuted: "rgba(96, 165, 250, 0.14)",
  borrowed: "#F59E0B",
  borrowedMuted: "rgba(245, 158, 11, 0.15)",

  categoryPalette,
};

export type ThemeColors = typeof darkColors;

/**
 * The same roles on a light surface. Semantic colours are one step deeper than in the dark theme,
 * so they hold their contrast on white.
 */
export const lightColors: ThemeColors = {
  background: "#F5F6FA",
  surface: "#FFFFFF",
  surfaceRaised: "#EEF1F6",
  border: "#D5DBE5",
  borderLight: "rgba(15, 23, 42, 0.08)",

  textPrimary: "#0F172A",
  textSecondary: "#4B5563",
  textMuted: "#8A94A6",

  accent: "#6366F1",
  accentMuted: "rgba(99, 102, 241, 0.12)",
  accentForeground: "#FFFFFF",
  accentText: "#4F46E5",
  accentFill: "#4F46E5",
  highlight: "rgba(99, 102, 241, 0.16)",
  scrim: "rgba(15, 23, 42, 0.45)",

  shadow: "#000000",

  iconNeutral: "#334155",
  iconBg: "rgba(15, 23, 42, 0.04)",
  iconBorder: "rgba(15, 23, 42, 0.08)",

  danger: "#DC2626",
  dangerMuted: "rgba(220, 38, 38, 0.10)",
  dangerStrong: "#DC2626",
  warning: "#D97706",
  warningMuted: "rgba(217, 119, 6, 0.12)",
  success: "#059669",
  successMuted: "rgba(5, 150, 105, 0.12)",

  lent: "#2563EB",
  lentMuted: "rgba(37, 99, 235, 0.10)",
  borrowed: "#D97706",
  borrowedMuted: "rgba(217, 119, 6, 0.12)",

  categoryPalette,
};

/** The palette for this run, chosen at startup (theme/appearance.ts). */
export const colors: ThemeColors = activeScheme === "light" ? lightColors : darkColors;
