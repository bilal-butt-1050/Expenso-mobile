import { TextStyle } from "react-native";
import { colors } from "./colors";

// Larger, cleaner type scale.
// Every size bumped for readability on mobile screens.
export const typography: Record<string, TextStyle> = {
  display: { fontSize: 38, fontWeight: "800", color: colors.textPrimary, letterSpacing: -0.5 },
  title:   { fontSize: 28, fontWeight: "700", color: colors.textPrimary, letterSpacing: -0.3 },
  subtitle:{ fontSize: 20, fontWeight: "600", color: colors.textSecondary },
  body:    { fontSize: 17, fontWeight: "500", color: colors.textPrimary },
  caption: { fontSize: 15, fontWeight: "500", color: colors.textSecondary },
  small:   { fontSize: 14, fontWeight: "600", color: colors.textSecondary },
  metricValue: { fontSize: 32, fontWeight: "800", color: colors.textPrimary, letterSpacing: -0.3 },
};
