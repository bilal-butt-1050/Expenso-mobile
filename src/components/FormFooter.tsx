import React from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAndroidKeyboardHeight } from "../hooks/useKeyboardHeight";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";

interface Props {
  children: React.ReactNode;
  /** Off while a sheet covers the form, so a keyboard opened in the sheet doesn't move the form. */
  trackKeyboard?: boolean;
}

/**
 * A form's primary action, pinned under its scroll and above the keyboard (B1). Put it after the
 * ScrollView, inside the form's root (a KeyboardAvoidingView that pads on iOS only).
 *
 * Android: RootNavigator shrinks the app above the keyboard, so the footer sits on it. It only
 * drops its navigation-bar padding while the keyboard is up (the keyboard covers that bar).
 */
export function FormFooter({ children, trackKeyboard = true }: Props) {
  const insets = useSafeAreaInsets();
  const keyboardHeight = useAndroidKeyboardHeight(trackKeyboard);
  const keyboardUp = keyboardHeight > 0;

  return (
    <View
      style={[
        styles.footer,
        { paddingBottom: keyboardUp ? spacing.md : Math.max(insets.bottom, spacing.md) },
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    backgroundColor: colors.background,
  },
});
