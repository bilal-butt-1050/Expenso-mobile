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
 * Android: the app is edge-to-edge, so the window doesn't resize for the keyboard and the
 * KeyboardAvoidingView does nothing (`padding` there would double-lift, ui-review 8.1). The footer
 * lifts itself instead, by the keyboard's full offset from the screen's bottom edge. The scroll above
 * it shrinks to match, so every field can still be scrolled into view.
 */
export function FormFooter({ children, trackKeyboard = true }: Props) {
  const insets = useSafeAreaInsets();
  const keyboardHeight = useAndroidKeyboardHeight(trackKeyboard);
  const keyboardUp = keyboardHeight > 0;

  return (
    <View
      style={[
        styles.footer,
        keyboardUp
          ? // The keyboard already covers the navigation bar, so only the gap above it remains.
            { marginBottom: keyboardHeight + insets.bottom, paddingBottom: spacing.md }
          : { paddingBottom: Math.max(insets.bottom, spacing.md) },
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
