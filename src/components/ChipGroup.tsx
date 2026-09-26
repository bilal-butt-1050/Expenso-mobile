import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import { radius, size, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { hapticLight } from "../utils/haptics";

interface Props<T extends string> {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
}

/**
 * Single-choice chips (DESIGN §S7). Replaces the equal-width segment row, which truncated
 * "Bank Transfer" on a narrow phone. Chips size to their label and wrap instead, and the selected
 * one carries a check mark so selection isn't signalled by colour alone.
 */
export function ChipGroup<T extends string>({ label, options, value, onChange }: Props<T>) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={label}>
        {options.map((option) => {
          const checked = option === value;
          return (
            <Pressable
              key={option}
              onPress={() => {
                if (checked) return;
                hapticLight();
                onChange(option);
              }}
              style={({ pressed }) => [styles.chip, checked && styles.chipChecked, pressed && styles.pressed]}
              accessibilityRole="radio"
              accessibilityState={{ checked }}
              accessibilityLabel={option}
            >
              {checked ? <MaterialCommunityIcons name="check" size={16} color={colors.textPrimary} /> : null}
              <Text style={[styles.chipLabel, checked && styles.chipLabelChecked]}>{option}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: spacing.md },
  label: { ...typography.caption, fontWeight: "600", marginBottom: spacing.xs },
  row: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    minHeight: size.minTouch,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipChecked: { backgroundColor: colors.accentMuted, borderColor: colors.accent },
  pressed: { opacity: 0.7 },
  chipLabel: { ...typography.caption, fontWeight: "600", color: colors.textSecondary },
  chipLabelChecked: { color: colors.textPrimary, fontWeight: "700" },
});
