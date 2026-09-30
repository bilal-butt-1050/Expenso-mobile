import React from "react";
import { StyleSheet, Text, TextInput, TextInputProps, View } from "react-native";
import { colors } from "../theme/colors";
import { radius, size, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

interface Props extends TextInputProps {
  /** React 19 passes `ref` as a prop; it reaches the TextInput, so forms can focus a field. */
  ref?: React.Ref<TextInput>;
  label?: string;
  error?: string | null;
  rightElement?: React.ReactNode;
}

export function TextField({ label, error, rightElement, style, ...inputProps }: Props) {
  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.inputWrap}>
        <TextInput
          // The visible label names the field; otherwise TalkBack reads the placeholder (P10).
          accessibilityLabel={inputProps.accessibilityLabel ?? label}
          placeholderTextColor={colors.textMuted}
          style={[styles.input, !!error && styles.inputError, style, !!rightElement && styles.inputWithRight]}
          {...inputProps}
        />
        {rightElement && <View style={styles.rightElementWrap}>{rightElement}</View>}
      </View>
      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.md },
  label: { ...typography.caption, fontWeight: "600", marginBottom: spacing.xs },
  inputWrap: {
    position: "relative",
    justifyContent: "center",
  },
  input: {
    minHeight: 56,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    color: colors.textPrimary,
    ...typography.body,
    fontWeight: "400",
  },
  inputWithRight: {
    paddingRight: size.minTouch,
  },
  rightElementWrap: {
    position: "absolute",
    right: spacing.sm,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  inputError: { borderColor: colors.danger },
  error: { ...typography.small, fontWeight: "500", color: colors.danger, marginTop: spacing.xs },
});
