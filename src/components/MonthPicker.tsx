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

export function MonthPicker({ month, onChange }: Props) {
  const isCurrentMonth = isCurrentOrFutureMonth(month);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.arrowBtn}
        onPress={() => onChange(shiftMonth(month, -1))}
        hitSlop={10}
        activeOpacity={0.7}
        accessibilityLabel="Previous month"
      >
        <MaterialCommunityIcons name="chevron-left" size={24} color={colors.textPrimary} />
      </TouchableOpacity>

      <Text style={styles.label}>{formatMonthLabel(month)}</Text>

      <TouchableOpacity
        style={[styles.arrowBtn, isCurrentMonth && styles.arrowDisabled]}
        onPress={() => !isCurrentMonth && onChange(shiftMonth(month, 1))}
        disabled={isCurrentMonth}
        hitSlop={10}
        activeOpacity={0.7}
        accessibilityLabel="Next month"
      >
        <MaterialCommunityIcons
          name="chevron-right"
          size={24}
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
    paddingVertical: 6,
  },
  label: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  arrowBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
  },
  arrowDisabled: {
    opacity: 0.25,
  },
});
