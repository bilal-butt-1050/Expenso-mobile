import React from "react";
import { iconName } from "../utils/icons";
import { StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

interface Props {
  icon: string;
  title: string;
  subtitle?: string;
}

export function EmptyState({ icon, title, subtitle }: Props) {
  return (
    <View style={styles.container}>
      <MaterialCommunityIcons name={iconName(icon)} size={48} color={colors.textMuted} />
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", justifyContent: "center", paddingVertical: spacing.xxl + spacing.md, gap: spacing.sm },
  title: { ...typography.body, color: colors.textSecondary, fontWeight: "600" },
  // textSecondary, not textMuted: muted fails 4.5:1 and is for disabled content only (§4.1).
  subtitle: {
    ...typography.caption,
    fontWeight: "400",
    color: colors.textSecondary,
    textAlign: "center",
    paddingHorizontal: spacing.xl,
  },
});
