import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { radius, spacing } from "../theme/spacing";
import { colors } from "../theme/colors";

interface Props {
  icon: string;
  color?: string;
  size?: number;
}

/**
 * Neutralized Icon Badge:
 * Uniform, elegant frosted charcoal container with refined silver-white icon.
 * Gives all list items (expenses, incomes, categories, settings) a calm,
 * cohesive, and premium aesthetic without visual clutter.
 */
export function CategoryPill({ icon, color, size = 38 }: Props) {
  return (
    <View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
    >
      <MaterialCommunityIcons
        name={icon as any}
        size={size * 0.48}
        color={colors.iconNeutral}
      />
    </View>
  );
}

export function StatusBadge({ status }: { status: "Paid" | "Unpaid" }) {
  const isPaid = status === "Paid";
  return (
    <View
      style={[
        styles.badge,
        isPaid ? styles.badgePaid : styles.badgeUnpaid,
      ]}
    >
      {isPaid && (
        <MaterialCommunityIcons name="check" size={11} color={colors.textPrimary} />
      )}
      <Text
        style={[
          styles.badgeText,
          { color: isPaid ? colors.textPrimary : colors.danger },
        ]}
      >
        {status}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.iconBg,
    borderWidth: 1,
    borderColor: colors.iconBorder,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  badgePaid: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderColor: "rgba(255, 255, 255, 0.14)",
  },
  badgeUnpaid: {
    backgroundColor: colors.dangerMuted,
    borderColor: "rgba(239, 68, 68, 0.28)",
  },
  badgeText: { fontSize: 11, fontWeight: "700" },
});
