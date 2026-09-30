import React, { useState, useSyncExternalStore } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { onlineManager } from "@tanstack/react-query";
import { ScreenContainer } from "../../components/ScreenContainer";
import { TextField } from "../../components/TextField";
import { Button } from "../../components/Button";
import { useOpeningBalance } from "../../hooks/useOpeningBalance";
import { usePendingWriteCount } from "../../lib/onlineStatus";
import { useAuth } from "../../context/AuthContext";
import { getErrorMessage } from "../../api/client";
import { formatAmountInput } from "../../utils/currency";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

/**
 * The one time the user says what money they have (D-64): right after sign-up, or once for an
 * account that never set it. It becomes the fixed starting point for every cash figure, so it
 * can't be changed afterwards. Saving refetches the user, which lets the navigator move on.
 */
export function OpeningCashScreen() {
  const { save, isSaving } = useOpeningBalance();
  const { user, logout } = useAuth();
  const online = useSyncExternalStore(onlineManager.subscribe, () => onlineManager.isOnline());
  // Queued writes aren't in the server's ledger yet, so the stored amount would be off by them, for
  // good (G4 M2).
  const pendingWrites = usePendingWriteCount();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const amount = Number(value.replace(/,/g, ""));
  const valid = value.trim() !== "" && Number.isFinite(amount) && amount >= 0;

  const handleContinue = async () => {
    if (!valid) {
      setError("Enter how much you have, or 0");
      return;
    }
    setError(null);
    try {
      await save(amount);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <ScreenContainer>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>How much money do you have right now?</Text>
          <Text style={styles.body}>
            {user?.name ? `${user.name.split(" ")[0]}, add` : "Add"} up all your cash and bank money. This is your
            starting point: every figure builds on it, and it can't be changed later.
          </Text>
          <TextField
            label="Money you have today"
            value={value}
            onChangeText={(text) => setValue(formatAmountInput(text))}
            keyboardType="decimal-pad"
            placeholder="0"
            autoFocus
            error={error}
          />
          {!online ? (
            <Text style={styles.offline}>You're offline. Connect to continue.</Text>
          ) : pendingWrites > 0 ? (
            <Text style={styles.offline}>Some changes are still syncing. Try again in a moment.</Text>
          ) : null}
          <View style={styles.actions}>
            <Button
              label="Continue"
              onPress={handleContinue}
              loading={isSaving}
              disabled={!online || pendingWrites > 0 || !valid}
            />
            {/* The only way out for someone signed in to the wrong account (G4 m4). */}
            <Button label="Sign out" variant="ghost" onPress={logout} disabled={isSaving} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: "center", gap: spacing.md, paddingVertical: spacing.xl },
  title: { ...typography.title, color: colors.textPrimary },
  body: { ...typography.body, color: colors.textSecondary },
  offline: { ...typography.small, color: colors.warning },
  actions: { marginTop: spacing.sm, gap: spacing.sm },
});
