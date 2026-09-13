import React from "react";
import { StyleSheet, Text, TextInput, TextInputProps, View } from "react-native";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/spacing";

interface Props extends TextInputProps {
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
          placeholderTextColor={colors.textMuted}
          style={[styles.input, !!error && styles.inputError, style, !!rightElement && styles.inputWithRight]}
          {...inputProps}
        />
        {rightElement && <View style={styles.rightElementWrap}>{rightElement}</View>}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.md },
  label: { fontSize: 15, fontWeight: "600", color: colors.textSecondary, marginBottom: spacing.xs },
  inputWrap: {
    position: "relative",
    justifyContent: "center",
  },
  input: {
    height: 56,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    color: colors.textPrimary,
    fontSize: 17,
  },
  inputWithRight: {
    paddingRight: 48,
  },
  rightElementWrap: {
    position: "absolute",
    right: spacing.sm,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  inputError: { borderColor: colors.danger },
  error: { color: colors.danger, fontSize: 14, marginTop: spacing.xs },
});
