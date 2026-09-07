import { TextStyle } from "react-native";
import { colors } from "./colors";

// Named text styles instead of ad-hoc fontSize/fontWeight props scattered
// across screens — change "title" once here, every screen picks it up.
export const typography: Record<string, TextStyle> = {
  display: { fontSize: 34, fontWeight: "800", color: colors.textPrimary },
  title: { fontSize: 24, fontWeight: "700", color: colors.textPrimary },
  subtitle: { fontSize: 18, fontWeight: "600", color: colors.textSecondary },
  body: { fontSize: 16, fontWeight: "500", color: colors.textPrimary },
  caption: { fontSize: 14, fontWeight: "500", color: colors.textSecondary },
  small: { fontSize: 13, fontWeight: "600", color: colors.textSecondary },
  metricValue: { fontSize: 28, fontWeight: "800", color: colors.textPrimary },
};
