import React from "react";
import { iconName } from "../utils/icons";
import { StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
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
// `color` is accepted for callers but unused: pills are deliberately neutral (see above).
export function CategoryPill({ icon, size = 38 }: Props) {
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
        name={iconName(icon)}
        size={size * 0.48}
        color={colors.iconNeutral}
      />
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
});
