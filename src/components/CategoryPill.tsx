import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { radius, spacing } from "../theme/spacing";
import { colors } from "../theme/colors";

interface Props {
  icon: string;
  color: string;
  size?: number;
}

// A small circular icon badge tinted with the category's own color —
// this is what makes categories instantly recognizable while scanning a
// list, without needing to read the label every time.
export function CategoryPill({ icon, color, size = 36 }: Props) {
  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: `${color}26` },
      ]}
    >
      <MaterialCommunityIcons name={icon as any} size={size * 0.5} color={color} />
    </View>
  );
}

export function StatusBadge({ status }: { status: "Paid" | "Unpaid" }) {
  const isPaid = status === "Paid";
  return (
    <View style={[styles.badge, { backgroundColor: isPaid ? colors.accentMuted : colors.dangerMuted }]}>
      <Text style={[styles.badgeText, { color: isPaid ? colors.accent : colors.danger }]}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: "center", justifyContent: "center" },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    alignSelf: "flex-start",
  },
  badgeText: { fontSize: 11, fontWeight: "700" },
});
