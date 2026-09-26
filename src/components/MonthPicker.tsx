import React, { useState } from "react";
import { Pressable, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BottomSheet } from "./BottomSheet";
import { colors } from "../theme/colors";
import { radius, size, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { currentMonthKey, formatMonthLabel, isCurrentOrFutureMonth, shiftMonth } from "../utils/date";
import { hapticLight } from "../utils/haptics";

interface Props {
  month: string;
  onChange: (month: string) => void;
  allowFuture?: boolean;
}

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August",
  "September", "October", "November", "December"];

/** Font scale at which the label shortens to "Aug '26" (DESIGN NFR-4, Home top row). */
const SHORT_LABEL_AT_FONT_SCALE = 1.5;

function monthKey(year: number, monthIndex: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

/**
 * ‹ Month ▾ › (DESIGN §S6). The arrows step one month; tapping the label opens a month/year grid,
 * so jumping to last March no longer takes six taps.
 */
export function MonthPicker({ month, onChange, allowFuture = false }: Props) {
  const { fontScale } = useWindowDimensions();
  const [sheetOpen, setSheetOpen] = useState(false);
  // The year the grid shows. Reset to the selected month's year each time the sheet opens (§8.2).
  const [gridYear, setGridYear] = useState(() => Number(month.slice(0, 4)));

  const isRightDisabled = !allowFuture && isCurrentOrFutureMonth(month);
  const [year, monthNum] = month.split("-").map(Number);
  const label =
    fontScale >= SHORT_LABEL_AT_FONT_SCALE
      ? `${MONTHS_SHORT[monthNum - 1]} '${String(year).slice(2)}`
      : formatMonthLabel(month);

  const current = currentMonthKey();
  const currentYear = Number(current.slice(0, 4));
  const nextYearDisabled = !allowFuture && gridYear >= currentYear;

  const openSheet = () => {
    setGridYear(year);
    setSheetOpen(true);
  };

  const pick = (key: string) => {
    hapticLight();
    setSheetOpen(false);
    if (key !== month) onChange(key);
  };

  return (
    <>
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.arrowBtn}
          onPress={() => onChange(shiftMonth(month, -1))}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Previous month"
        >
          <MaterialCommunityIcons name="chevron-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>

        <Pressable
          onPress={openSheet}
          style={({ pressed }) => [styles.labelBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={`${formatMonthLabel(month)}, change month`}
        >
          <Text style={styles.label} numberOfLines={1}>
            {label}
          </Text>
          <MaterialCommunityIcons name="chevron-down" size={16} color={colors.textSecondary} />
        </Pressable>

        <TouchableOpacity
          style={[styles.arrowBtn, isRightDisabled && styles.arrowDisabled]}
          onPress={() => !isRightDisabled && onChange(shiftMonth(month, 1))}
          disabled={isRightDisabled}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Next month"
          accessibilityState={{ disabled: isRightDisabled }}
        >
          <MaterialCommunityIcons
            name="chevron-right"
            size={24}
            color={isRightDisabled ? colors.textMuted : colors.textPrimary}
          />
        </TouchableOpacity>
      </View>

      <BottomSheet visible={sheetOpen} onClose={() => setSheetOpen(false)}>
        <View style={styles.yearRow}>
          <TouchableOpacity
            style={styles.arrowBtn}
            onPress={() => setGridYear((y) => y - 1)}
            accessibilityRole="button"
            accessibilityLabel="Previous year"
          >
            <MaterialCommunityIcons name="chevron-left" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.yearLabel} accessibilityRole="header">
            {gridYear}
          </Text>
          <TouchableOpacity
            style={[styles.arrowBtn, nextYearDisabled && styles.arrowDisabled]}
            onPress={() => !nextYearDisabled && setGridYear((y) => y + 1)}
            disabled={nextYearDisabled}
            accessibilityRole="button"
            accessibilityLabel="Next year"
            accessibilityState={{ disabled: nextYearDisabled }}
          >
            <MaterialCommunityIcons
              name="chevron-right"
              size={24}
              color={nextYearDisabled ? colors.textMuted : colors.textPrimary}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.grid}>
          {MONTHS_SHORT.map((short, i) => {
            const key = monthKey(gridYear, i);
            const selected = key === month;
            const isCurrent = key === current;
            const disabled = !allowFuture && key > current;
            return (
              <Pressable
                key={key}
                onPress={() => pick(key)}
                disabled={disabled}
                style={({ pressed }) => [
                  styles.cell,
                  selected && styles.cellSelected,
                  disabled && styles.cellDisabled,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${MONTHS_LONG[i]} ${gridYear}${isCurrent ? ", current month" : ""}`}
                accessibilityState={{ selected, disabled }}
              >
                <Text
                  style={[
                    styles.cellLabel,
                    selected && styles.cellLabelSelected,
                    disabled && styles.cellLabelDisabled,
                  ]}
                >
                  {short}
                </Text>
                {isCurrent ? <View style={styles.currentDot} /> : null}
              </Pressable>
            );
          })}
        </View>
      </BottomSheet>
    </>
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
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  labelBtn: {
    flexShrink: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    minHeight: size.minTouch,
    paddingHorizontal: spacing.xs,
  },
  label: { ...typography.body, fontWeight: "700", flexShrink: 1 },
  pressed: { opacity: 0.7 },
  arrowBtn: {
    width: size.minTouch,
    height: size.minTouch,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
  },
  arrowDisabled: { opacity: 0.25 },

  yearRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  yearLabel: { ...typography.subtitle, color: colors.textPrimary, fontWeight: "700" },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: spacing.sm,
    paddingBottom: spacing.md,
  },
  cell: {
    width: "31%",
    minHeight: size.minTouch,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "transparent",
    backgroundColor: colors.surfaceRaised,
  },
  cellSelected: { backgroundColor: colors.accentMuted, borderColor: colors.accent },
  cellDisabled: { backgroundColor: "transparent" },
  cellLabel: { ...typography.body, fontWeight: "600", color: colors.textPrimary },
  cellLabelSelected: { fontWeight: "700" },
  cellLabelDisabled: { color: colors.textMuted },
  currentDot: {
    width: 6,
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    marginTop: spacing.xs,
  },
});
