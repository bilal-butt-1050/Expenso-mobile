import React from "react";
import {
  ActivityIndicator,
  GestureResponderEvent,
  StyleSheet,
  Text,
  ViewStyle,
} from "react-native";
import { PressableScale } from "./PressableScale";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

type Variant = "primary" | "secondary" | "danger" | "ghost";

interface Props {
  label: string;
  onPress: (event: GestureResponderEvent) => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({ label, onPress, variant = "primary", loading, disabled, style }: Props) {
  const isDisabled = disabled || loading;

  return (
    <PressableScale
      onPress={onPress}
      disabled={isDisabled}
      style={[styles.base, variantStyles[variant], isDisabled && styles.disabled, style]}
      accessibilityRole="button"
      accessibilityLabel={label}
      // Otherwise a disabled Save is announced as active, and a busy one gives no sign (P7).
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? colors.accentForeground : colors.textPrimary} />
      ) : (
        <Text style={[styles.label, textVariantStyles[variant]]}>{label}</Text>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    // minHeight, so a label at 200% font grows the button instead of clipping.
    minHeight: 54,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  label: { ...typography.button, textAlign: "center" },
  disabled: { opacity: 0.5 },
});

const variantStyles: Record<Variant, ViewStyle> = {
  primary: { backgroundColor: colors.accentFill },
  secondary: { backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border },
  danger: { backgroundColor: colors.dangerMuted, borderWidth: 1, borderColor: colors.danger },
  ghost: { backgroundColor: "transparent" },
};

const textVariantStyles = {
  primary: { color: colors.accentForeground },
  secondary: { color: colors.textPrimary },
  danger: { color: colors.danger },
  ghost: { color: colors.textPrimary },
};
