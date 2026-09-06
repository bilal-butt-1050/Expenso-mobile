import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/spacing";
import { formatMonthLabel, isCurrentOrFutureMonth, shiftMonth } from "../utils/date";

interface Props {
  month: string;
  onChange: (month: string) => void;
}

// Month navigation selector: allows stepping month-by-month,
// preventing navigation beyond the current month.
export function MonthPicker({ month, onChange }: Props) {
  const atPresent = isCurrentOrFutureMonth(shiftMonth(month, 1));

  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={styles.arrow}
        onPress={() => onChange(shiftMonth(month, -1))}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.arrowText}>‹</Text>
      </TouchableOpacity>

      <Text style={styles.label}>{formatMonthLabel(month)}</Text>

      <TouchableOpacity
        style={[styles.arrow, atPresent && styles.arrowDisabled]}
        onPress={() => !atPresent && onChange(shiftMonth(month, 1))}
        disabled={atPresent}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={[styles.arrowText, atPresent && styles.arrowTextDisabled]}>›</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.lg,
  },
  label: { fontSize: 17, fontWeight: "700", color: colors.textPrimary, minWidth: 110, textAlign: "center" },
  arrow: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
  },
  arrowDisabled: { opacity: 0.3 },
  arrowText: { fontSize: 20, color: colors.accent, fontWeight: "700", marginTop: -2 },
  arrowTextDisabled: { color: colors.textMuted },
});
