import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Keyboard,
  Animated,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useRegisterOverlay } from "../lib/overlays";
import { useLatest } from "../hooks/useLatest";
import { useReduceMotion } from "../hooks/useReduceMotion";

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface Props {
  value: Date;
  onChange: (date: Date) => void;
  label?: string;
  maxDate?: Date;
  /** The earliest day that can be picked: history starts at the join date (D-67). */
  minDate?: Date;
}

const CELL_SIZE = 42;

/**
 * Custom in-theme calendar date picker.
 * Uses Modal with pre-mounted content and pure translateY animation (no scale)
 * to avoid layout-recalc jitter when opening.
 */
export function DatePicker({ value, onChange, label, maxDate, minDate }: Props) {
  const [open, setOpen] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  useRegisterOverlay(modalVisible);
  const [viewYear, setViewYear] = useState(value.getFullYear());
  const [viewMonth, setViewMonth] = useState(value.getMonth());

  // Single animated value for enter/exit
  const anim = useRef(new Animated.Value(0)).current;
  const modalVisibleRef = useLatest(modalVisible);
  // Reduced motion: the card fades in place instead of also rising.
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    if (open) {
      setModalVisible(true);
      // Reset to start position and animate in on next frame
      anim.setValue(0);
      requestAnimationFrame(() => {
        Animated.timing(anim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }).start();
      });
    } else if (modalVisibleRef.current) {
      // Animate out, then unmount modal
      Animated.timing(anim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }).start(() => {
        setModalVisible(false);
      });
    }
  }, [open, anim, modalVisibleRef]);

  const formatted = `${value.getDate()} ${MONTHS[value.getMonth()].slice(0, 3)} ${value.getFullYear()}`;

  const days = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const blanks: null[] = Array(firstDay).fill(null);
    const dates = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    return [...blanks, ...dates];
  }, [viewYear, viewMonth]);

  const prevMonth = useCallback(() => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  }, [viewMonth, viewYear]);

  const nextMonth = useCallback(() => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  }, [viewMonth, viewYear]);

  const selectDay = useCallback((day: number) => {
    onChange(new Date(viewYear, viewMonth, day, 12, 0, 0));
    setOpen(false);
  }, [viewYear, viewMonth, onChange]);

  const isSelected = useCallback((day: number) =>
    day === value.getDate() &&
    viewMonth === value.getMonth() &&
    viewYear === value.getFullYear(),
  [value, viewMonth, viewYear]);

  const isToday = useCallback((day: number) => {
    const now = new Date();
    return day === now.getDate() && viewMonth === now.getMonth() && viewYear === now.getFullYear();
  }, [viewMonth, viewYear]);

  const isDisabled = useCallback((day: number) => {
    const current = new Date(viewYear, viewMonth, day).getTime();
    if (maxDate && current > new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate()).getTime()) return true;
    if (minDate && current < new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate()).getTime()) return true;
    return false;
  }, [viewYear, viewMonth, maxDate, minDate]);

  const isPrevMonthDisabled = useMemo(() => {
    if (!minDate) return false;
    // The last day of the previous month is before the earliest day: nothing to pick there.
    return new Date(viewYear, viewMonth, 0).getTime() < new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate()).getTime();
  }, [viewMonth, viewYear, minDate]);

  const isNextMonthDisabled = useMemo(() => {
    if (!maxDate) return false;
    let nextM = viewMonth + 1;
    let nextY = viewYear;
    if (nextM > 11) {
      nextM = 0;
      nextY += 1;
    }
    const firstOfNextMonth = new Date(nextY, nextM, 1).getTime();
    const max = new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate()).getTime();
    return firstOfNextMonth > max;
  }, [viewMonth, viewYear, maxDate]);

  const handleOpen = useCallback(() => {
    Keyboard.dismiss();
    setViewYear(value.getFullYear());
    setViewMonth(value.getMonth());
    setOpen(true);
  }, [value]);

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  // Interpolations — pure translateY, no scale (avoids layout recalc jitter)
  const backdropOpacity = anim;
  const cardTranslateY = reduceMotion
    ? 0
    : anim.interpolate({
        inputRange: [0, 1],
        outputRange: [30, 0],
      });

  return (
    <>
      <View style={styles.fieldWrap}>
        {label && <Text style={styles.label}>{label}</Text>}
        <TouchableOpacity
          style={styles.trigger}
          onPress={handleOpen}
          activeOpacity={0.7}
          accessibilityLabel={`Select date, currently ${formatted}`}
          accessibilityRole="button"
        >
          <MaterialCommunityIcons name="calendar-outline" size={22} color={colors.textSecondary} />
          <Text style={styles.triggerText}>{formatted}</Text>
          <MaterialCommunityIcons name="chevron-down" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <Modal visible={modalVisible} transparent animationType="none" onRequestClose={handleClose}>
        {/* Backdrop */}
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={handleClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
          />
        </Animated.View>

        {/* Card — no scale, only translateY + opacity */}
        <Animated.View
          style={[
            styles.cardWrap,
            {
              opacity: anim,
              transform: [{ translateY: cardTranslateY }],
            },
          ]}
        >
          <View style={styles.card}>
            {/* Header with month/year nav */}
            <View style={styles.calHeader}>
              <TouchableOpacity
                onPress={() => { if (!isPrevMonthDisabled) prevMonth(); }}
                hitSlop={12}
                style={styles.navBtn}
                activeOpacity={isPrevMonthDisabled ? 1 : 0.2}
                accessibilityRole="button"
                accessibilityLabel="Previous month"
                accessibilityState={{ disabled: isPrevMonthDisabled }}
              >
                <MaterialCommunityIcons
                  name="chevron-left"
                  size={24}
                  color={isPrevMonthDisabled ? colors.textMuted : colors.textPrimary}
                />
              </TouchableOpacity>
              <Text style={styles.calTitle} accessibilityRole="header">
                {MONTHS[viewMonth]} {viewYear}
              </Text>
              <TouchableOpacity 
                onPress={() => { if (!isNextMonthDisabled) nextMonth() }} 
                hitSlop={12} 
                style={styles.navBtn}
                activeOpacity={isNextMonthDisabled ? 1 : 0.2}
                accessibilityRole="button"
                accessibilityLabel="Next month"
                accessibilityState={{ disabled: isNextMonthDisabled }}
              >
                <MaterialCommunityIcons 
                  name="chevron-right" 
                  size={24} 
                  color={isNextMonthDisabled ? colors.textMuted : colors.textPrimary} 
                />
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
                      onPress={() => {
                        if (!isDisabled(day)) selectDay(day);
                      }}
                      style={[
                        styles.cell,
                        isSelected(day) && styles.cellSelected,
                        isToday(day) && !isSelected(day) && styles.cellToday,
                      ]}
                      activeOpacity={isDisabled(day) ? 1 : 0.6}
                      accessibilityRole="button"
                      accessibilityLabel={`${day} ${MONTHS[viewMonth]} ${viewYear}${isToday(day) ? ", today" : ""}`}
                      accessibilityState={{ selected: isSelected(day), disabled: isDisabled(day) }}
                    >
                      <Text
                        style={[
                          styles.cellText,
                          isSelected(day) && styles.cellTextSelected,
                          isToday(day) && !isSelected(day) && styles.cellTextToday,
                          isDisabled(day) && styles.cellTextDisabled,
                        ]}
                      >
                        {day}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ))}
            </View>
          </View>
        </Animated.View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fieldWrap: { marginBottom: spacing.md },
  label: {
    ...typography.caption,
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
    ...typography.body,
    fontWeight: "600",
    color: colors.textPrimary,
  },

  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.scrim,
  },
  cardWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.lg,
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
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  calTitle: {
    ...typography.subtitle,
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
    ...typography.small,
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
    marginBottom: spacing.xs,
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: CELL_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  // The app's one selection style, as on the chips and the month grid (W6).
  cellSelected: {
    backgroundColor: colors.accentMuted,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  cellToday: {
    borderWidth: 1.5,
    borderColor: colors.textMuted,
  },
  cellText: {
    ...typography.body,
    fontWeight: "500",
    color: colors.textPrimary,
  },
  cellTextSelected: {
    color: colors.textPrimary,
    fontWeight: "700",
  },
  cellTextDisabled: {
    color: colors.border,
  },
  cellTextToday: {
    color: colors.textPrimary,
    fontWeight: "700",
  },
});
