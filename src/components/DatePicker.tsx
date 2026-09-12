import React, { useState, useMemo } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/spacing";

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface Props {
  value: Date;
  onChange: (date: Date) => void;
  label?: string;
}

/**
 * Custom in-theme calendar date picker.
 * Replaces the deprecated @react-native-community/datetimepicker.
 * Matches the dark Platinum Minimalist theme perfectly.
 */
export function DatePicker({ value, onChange, label }: Props) {
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(value.getFullYear());
  const [viewMonth, setViewMonth] = useState(value.getMonth());

  const formatted = `${value.getDate()} ${MONTHS[value.getMonth()].slice(0, 3)} ${value.getFullYear()}`;

  const days = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const blanks: null[] = Array(firstDay).fill(null);
    const dates = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    return [...blanks, ...dates];
  }, [viewYear, viewMonth]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  const selectDay = (day: number) => {
    onChange(new Date(viewYear, viewMonth, day));
    setOpen(false);
  };

  const isSelected = (day: number) =>
    day === value.getDate() &&
    viewMonth === value.getMonth() &&
    viewYear === value.getFullYear();

  const isToday = (day: number) => {
    const now = new Date();
    return day === now.getDate() && viewMonth === now.getMonth() && viewYear === now.getFullYear();
  };

  return (
    <>
      <View style={styles.fieldWrap}>
        {label && <Text style={styles.label}>{label}</Text>}
        <TouchableOpacity
          style={styles.trigger}
          onPress={() => setOpen(true)}
          activeOpacity={0.7}
          accessibilityLabel={`Select date, currently ${formatted}`}
          accessibilityRole="button"
        >
          <MaterialCommunityIcons name="calendar-outline" size={22} color={colors.textSecondary} />
          <Text style={styles.triggerText}>{formatted}</Text>
          <MaterialCommunityIcons name="chevron-down" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setOpen(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.card}>
            {/* Header with month/year nav */}
            <View style={styles.calHeader}>
              <TouchableOpacity onPress={prevMonth} hitSlop={12} style={styles.navBtn}>
                <MaterialCommunityIcons name="chevron-left" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.calTitle}>
                {MONTHS[viewMonth]} {viewYear}
              </Text>
              <TouchableOpacity onPress={nextMonth} hitSlop={12} style={styles.navBtn}>
                <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Day headers */}
            <View style={styles.dayHeaderRow}>
              {DAYS.map((d) => (
                <Text key={d} style={styles.dayHeaderText}>{d}</Text>
              ))}
            </View>

            {/* Calendar grid */}
            <View style={styles.grid}>
              {days.map((day, idx) => (
                <View key={idx} style={styles.cellWrap}>
                  {day !== null ? (
                    <TouchableOpacity
                      onPress={() => selectDay(day)}
                      style={[
                        styles.cell,
                        isSelected(day) && styles.cellSelected,
                        isToday(day) && !isSelected(day) && styles.cellToday,
                      ]}
                      activeOpacity={0.6}
                    >
                      <Text
                        style={[
                          styles.cellText,
                          isSelected(day) && styles.cellTextSelected,
                          isToday(day) && !isSelected(day) && styles.cellTextToday,
                        ]}
                      >
                        {day}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ))}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const CELL_SIZE = 42;

const styles = StyleSheet.create({
  fieldWrap: { marginBottom: spacing.md },
  label: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  trigger: {
    height: 56,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  triggerText: {
    flex: 1,
    fontSize: 17,
    fontWeight: "600",
    color: colors.textPrimary,
  },

  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: colors.surfaceRaised,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },

  calHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  calTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
  },

  dayHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: spacing.xs,
  },
  dayHeaderText: {
    width: CELL_SIZE,
    textAlign: "center",
    fontSize: 13,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
  },
  cellWrap: {
    width: `${100 / 7}%`,
    alignItems: "center",
    marginBottom: 4,
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: CELL_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  cellSelected: {
    backgroundColor: colors.textPrimary,
  },
  cellToday: {
    borderWidth: 1.5,
    borderColor: colors.textMuted,
  },
  cellText: {
    fontSize: 16,
    fontWeight: "500",
    color: colors.textPrimary,
  },
  cellTextSelected: {
    color: colors.background,
    fontWeight: "700",
  },
  cellTextToday: {
    color: colors.textPrimary,
    fontWeight: "700",
  },
});
