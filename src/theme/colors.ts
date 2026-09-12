// Expenso — Premium Indigo FinTech Theme
// A vibrant, modern, high-end theme with deep navy/slate backgrounds and electric indigo accents.

export const colors = {
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

  // Unified Neutral Icon Tokens
  iconNeutral: "#E5E7EB",
  iconBg: "rgba(255, 255, 255, 0.05)",
  iconBorder: "rgba(255, 255, 255, 0.1)",

  // Subdued Functional Semantic Colors
  danger: "#EF4444",
  dangerMuted: "rgba(239, 68, 68, 0.15)",
  warning: "#F59E0B",
  warningMuted: "rgba(245, 158, 11, 0.15)",
  success: "#10B981",
  successMuted: "rgba(16, 185, 129, 0.15)",

  // Vibrant Monochromatic Palette for Categories & Charts
  categoryPalette: [
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
  ],
} as const;

export type ThemeColors = typeof colors;
