import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInputProps, TouchableOpacity, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BottomSheet } from "./BottomSheet";
import { TextField } from "./TextField";
import { Button } from "./Button";
import { useAuth } from "../context/AuthContext";
import { getErrorMessage } from "../api/client";
import { getFreshGoogleIdToken } from "../services/googleSignIn";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

const MIN_LENGTH = 8;

/**
 * Change the password, or set the first one on a Google-only account. Setting one needs Google to
 * confirm it's the account owner (the server requires a freshly issued Google token), so a stolen
 * session alone can't add a password. Mount with a new `key` per opening so fields start empty.
 */
export function PasswordSheet({
  visible,
  hasPassword,
  onClose,
  onDone,
}: {
  visible: boolean;
  hasPassword: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const { changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    if (hasPassword && !currentPassword) {
      setError("Enter your current password.");
      return;
    }
    if (newPassword.length < MIN_LENGTH) {
      setError(`The new password needs at least ${MIN_LENGTH} characters.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("The new passwords don't match.");
      return;
    }

    setSaving(true);
    try {
      if (hasPassword) {
        await changePassword({ currentPassword, newPassword });
      } else {
        const googleIdToken = await getFreshGoogleIdToken();
        if (!googleIdToken) return; // Closed the account picker: leave the form as it is.
        await changePassword({ newPassword, googleIdToken });
      }
      onDone();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      {/* Scrolls when the keyboard leaves too little room for the whole form. */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>{hasPassword ? "Change password" : "Set a password"}</Text>
        {!hasPassword ? (
          <Text style={styles.note}>
            Then you can also sign in with your email and this password. Google will ask you to confirm
            it's you.
          </Text>
        ) : null}
        {hasPassword ? (
          <PasswordField
            label="Current password"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            autoComplete="current-password"
            textContentType="password"
          />
        ) : null}
        <PasswordField
          label="New password"
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder={`At least ${MIN_LENGTH} characters`}
          autoComplete="new-password"
          textContentType="newPassword"
        />
        <PasswordField
          label="Confirm new password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          autoComplete="new-password"
          textContentType="newPassword"
          error={error}
        />
        <View style={styles.actions}>
          <Button label="Cancel" variant="secondary" onPress={onClose} style={styles.action} />
          <Button
            label={hasPassword ? "Update" : "Continue"}
            onPress={handleSubmit}
            loading={saving}
            style={styles.action}
          />
        </View>
      </ScrollView>
    </BottomSheet>
  );
}

/** A password input with its own show/hide toggle, as on the sign-in screen. */
function PasswordField(props: TextInputProps & { label: string; error?: string | null }) {
  const [visible, setVisible] = useState(false);
  return (
    <TextField
      {...props}
      secureTextEntry={!visible}
      autoCapitalize="none"
      autoCorrect={false}
      rightElement={
        <TouchableOpacity
          onPress={() => setVisible((v) => !v)}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={visible ? `Hide ${props.label.toLowerCase()}` : `Show ${props.label.toLowerCase()}`}
        >
          <MaterialCommunityIcons name={visible ? "eye-off-outline" : "eye-outline"} size={20} color={colors.textMuted} />
        </TouchableOpacity>
      }
    />
  );
}

const styles = StyleSheet.create({
  scroll: { flexShrink: 1 },
  content: { paddingVertical: spacing.sm, gap: spacing.md },
  title: { ...typography.subtitle, color: colors.textPrimary },
  note: { ...typography.caption, color: colors.textSecondary },
  actions: { flexDirection: "row", gap: spacing.md, marginTop: spacing.md },
  action: { flex: 1 },
});
