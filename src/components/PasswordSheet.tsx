import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
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
      <View style={styles.content}>
        <Text style={styles.title}>{hasPassword ? "Change Password" : "Set a Password"}</Text>
        {!hasPassword ? (
          <Text style={styles.note}>
            Then you can also sign in with your email and this password. Google will ask you to confirm
            it's you.
          </Text>
        ) : null}
        {hasPassword ? (
          <TextField
            label="Current Password"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry
            autoComplete="current-password"
            textContentType="password"
          />
        ) : null}
        <TextField
          label="New Password"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
          placeholder={`At least ${MIN_LENGTH} characters`}
          autoComplete="new-password"
          textContentType="newPassword"
        />
        <TextField
          label="Confirm New Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
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
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.xl, gap: spacing.md },
  title: { ...typography.subtitle, color: colors.textPrimary },
  note: { ...typography.caption, color: colors.textSecondary },
  actions: { flexDirection: "row", gap: spacing.md, marginTop: spacing.md },
  action: { flex: 1 },
});
