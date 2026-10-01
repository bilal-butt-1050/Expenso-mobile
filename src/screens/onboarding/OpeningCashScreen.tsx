import React, { useState, useSyncExternalStore } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { cashSchema, check, parseAmount } from "../../utils/validation";
import { onlineManager } from "@tanstack/react-query";
import { ScreenContainer } from "../../components/ScreenContainer";
import { TextField } from "../../components/TextField";
import { Button } from "../../components/Button";
import { useOpeningBalance } from "../../hooks/useOpeningBalance";
import { usePendingWriteCount } from "../../lib/onlineStatus";
import { useAuth } from "../../context/AuthContext";
import { getErrorMessage } from "../../api/client";
import { CURRENCY_OPTIONS, formatAmountInput } from "../../utils/currency";
import { colors } from "../../theme/colors";
import { radius, size, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

/**
 * The one time the user says what money they have (D-64): right after sign-up, or once for an
 * account that never set it. It becomes the fixed starting point for every cash figure, so it
 * can't be changed afterwards. Saving refetches the user, which lets the navigator move on.
 */
export function OpeningCashScreen() {
  const { save, isSaving } = useOpeningBalance();
  const { user, logout, updateProfile } = useAuth();
  // Step 1 is the currency (chosen once, at sign-up; Settings doesn't offer it for now), step 2 the
  // amount in it.
  const [step, setStep] = useState<"currency" | "amount">("currency");
  const [currency, setCurrency] = useState(user?.currency ?? "PKR");
  const [savingCurrency, setSavingCurrency] = useState(false);
  const online = useSyncExternalStore(onlineManager.subscribe, () => onlineManager.isOnline());
  // Queued writes aren't in the server's ledger yet, so the stored amount would be off by them, for
  // good (G4 M2).
  const pendingWrites = usePendingWriteCount();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const amount = parseAmount(value);
  const valid = check(cashSchema, amount) === null;

  const confirmCurrency = async () => {
    setError(null);
    if (currency === user?.currency) {
      setStep("amount");
      return;
    }
    setSavingCurrency(true);
    try {
      await updateProfile({ currency });
      setStep("amount");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSavingCurrency(false);
    }
  };

  const handleContinue = async () => {
    const problem = check(cashSchema, amount);
    if (problem) {
      setError(problem);
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
        <ScrollView
          showsVerticalScrollIndicator={false}
          overScrollMode="never"
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {step === "currency" ? (
            <>
              <Text style={styles.title}>Which currency do you use?</Text>
              <Text style={styles.body}>Every amount in the app is shown in it.</Text>
              <View style={styles.options} accessibilityRole="radiogroup">
                {CURRENCY_OPTIONS.map((option) => {
                  const selected = option.code === currency;
                  return (
                    <TouchableOpacity
                      key={option.code}
                      style={[styles.option, selected && styles.optionSelected]}
                      onPress={() => setCurrency(option.code)}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selected }}
                      accessibilityLabel={`${option.name}, ${option.code}`}
                    >
                      <Text style={[styles.optionCode, selected && styles.optionSelectedText]}>{option.code}</Text>
                      <Text style={styles.optionName}>{option.name}</Text>
                      {selected ? <MaterialCommunityIcons name="check" size={20} color={colors.accent} /> : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
              {error ? <Text style={styles.offline}>{error}</Text> : null}
              <View style={styles.actions}>
                <Button label="Continue" onPress={confirmCurrency} loading={savingCurrency} disabled={!online} />
                <Button label="Sign out" variant="ghost" onPress={logout} disabled={savingCurrency} />
              </View>
            </>
          ) : (
            <>
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
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  // From the top, not centred: centred content re-centred when the keyboard shrank the screen and
  // jumped up.
  content: { flexGrow: 1, gap: spacing.md, paddingTop: spacing.xxl, paddingBottom: spacing.xl },
  title: { ...typography.title, color: colors.textPrimary },
  body: { ...typography.body, color: colors.textSecondary },
  offline: { ...typography.small, color: colors.warning },
  actions: { marginTop: spacing.sm, gap: spacing.sm },
  options: { gap: spacing.xs },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: size.minTouch,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surface,
  },
  optionSelected: { backgroundColor: colors.accentMuted, borderColor: colors.accent },
  optionCode: { ...typography.body, fontWeight: "700", color: colors.textPrimary, width: 48 },
  optionSelectedText: { color: colors.textPrimary },
  optionName: { ...typography.body, color: colors.textSecondary, flex: 1 },
});
