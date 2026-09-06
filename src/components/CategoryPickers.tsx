import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/spacing";

// A curated set rather than a full icon-library browser — enough variety
// to represent almost any spending category without overwhelming a
// first-time user with thousands of icons to scroll through.
export const ICON_CHOICES = [
  "shape-outline", "bus", "food", "shopping", "movie", "file-document",
  "heart-pulse", "school", "account-group", "refresh", "airplane", "home",
  "gas-station", "gift", "paw", "dumbbell", "coffee", "phone", "laptop", "cash",
];

interface ColorProps {
  value: string;
  onChange: (color: string) => void;
}

export function ColorPicker({ value, onChange }: ColorProps) {
  return (
    <View>
      <Text style={styles.label}>Color</Text>
      <View style={styles.grid}>
        {colors.categoryPalette.map((c) => (
          <TouchableOpacity
            key={c}
            onPress={() => onChange(c)}
            style={[styles.swatch, { backgroundColor: c }, value === c && styles.swatchSelected]}
          />
        ))}
      </View>
    </View>
  );
}

interface IconProps {
  value: string;
  color: string;
  onChange: (icon: string) => void;
}

export function IconPicker({ value, color, onChange }: IconProps) {
  return (
    <View>
      <Text style={styles.label}>Icon</Text>
      <View style={styles.grid}>
        {ICON_CHOICES.map((icon) => {
          const selected = value === icon;
          return (
            <TouchableOpacity
              key={icon}
              onPress={() => onChange(icon)}
              style={[
                styles.iconSlot,
                { backgroundColor: selected ? `${color}26` : colors.surfaceRaised },
                selected && { borderColor: color, borderWidth: 1.5 },
              ]}
            >
              <MaterialCommunityIcons name={icon as any} size={20} color={selected ? color : colors.textSecondary} />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: "600", color: colors.textSecondary, marginBottom: spacing.sm },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.lg },
  swatch: { width: 32, height: 32, borderRadius: radius.pill, borderWidth: 2, borderColor: "transparent" },
  swatchSelected: { borderColor: colors.textPrimary },
  iconSlot: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "transparent",
  },
});
