import { TextStyle } from "react-native";
import { colors } from "./colors";

// Named text styles instead of ad-hoc fontSize/fontWeight props scattered
// across screens — change "title" once here, every screen picks it up.
export const typography: Record<string, TextStyle> = {
  display: { fontSize: 32, fontWeight: "700", color: colors.textPrimary },
  title: { fontSize: 20, fontWeight: "700", color: colors.textPrimary },
  subtitle: { fontSize: 15, fontWeight: "600", color: colors.textSecondary },
  body: { fontSize: 15, fontWeight: "400", color: colors.textPrimary },
  caption: { fontSize: 13, fontWeight: "400", color: colors.textSecondary },
  small: { fontSize: 11, fontWeight: "500", color: colors.textMuted },
  metricValue: { fontSize: 26, fontWeight: "700", color: colors.textPrimary },
};
