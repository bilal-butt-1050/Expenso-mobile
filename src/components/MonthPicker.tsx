import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/spacing";
import { formatMonthLabel, isCurrentOrFutureMonth, shiftMonth } from "../utils/date";

interface Props {
  month: string;
  onChange: (month: string) => void;
}

// Sleek minimal Month Picker capsule
export function MonthPicker({ month, onChange }: Props) {
  const isCurrentMonth = isCurrentOrFutureMonth(month);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.arrowBtn}
        onPress={() => onChange(shiftMonth(month, -1))}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        activeOpacity={0.7}
      >
        <MaterialCommunityIcons name="chevron-left" size={22} color={colors.textPrimary} />
      </TouchableOpacity>

      <View style={styles.centerBadge}>
        <MaterialCommunityIcons name="calendar-month-outline" size={16} color={colors.accent} />
        <Text style={styles.label}>{formatMonthLabel(month)}</Text>
      </View>

      <TouchableOpacity
        style={[styles.arrowBtn, isCurrentMonth && styles.arrowDisabled]}
        onPress={() => !isCurrentMonth && onChange(shiftMonth(month, 1))}
        disabled={isCurrentMonth}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        activeOpacity={0.7}
      >
        <MaterialCommunityIcons
          name="chevron-right"
          size={22}
          color={isCurrentMonth ? colors.textMuted : colors.textPrimary}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  centerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs + 2,
  },
  label: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  arrowBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
  },
  arrowDisabled: {
    opacity: 0.25,
  },
});
