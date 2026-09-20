import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RootStackParamList } from "../../types/navigation";
import { useAuth } from "../../context/AuthContext";
import { useLoans } from "../../hooks/useLoans";
import { LoanType } from "../../types/models";
import { TextField } from "../../components/TextField";
import { Button } from "../../components/Button";
import { DatePicker } from "../../components/DatePicker";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { formatAmountInput } from "../../utils/currency";
import { getErrorMessage } from "../../api/client";
import { hapticSuccess, hapticError, hapticLight } from "../../utils/haptics";

type Props = NativeStackScreenProps<RootStackParamList, "LoanForm">;

export function LoanFormScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { addLoan } = useLoans();

  const [type, setType] = useState<LoanType>("LENT");
  const [personName, setPersonName] = useState("");
  const [rawAmount, setRawAmount] = useState("");
  const [hasDueDate, setHasDueDate] = useState(false);
  const [dueDate, setDueDate] = useState<Date>(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)); // Default +7 days
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currencySymbol = user?.currency || "PKR";

  const handleAmountChange = (text: string) => {
    setRawAmount(formatAmountInput(text));
  };

  const handleSave = async () => {
    setError(null);

    const cleanName = personName.trim();
    if (!cleanName) {
      setError("Please enter the person or institution's name");
      hapticError();
      return;
    }

    const numericAmount = parseFloat(rawAmount.replace(/,/g, ""));
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError("Please enter a valid amount greater than 0");
      hapticError();
      return;
    }

    setIsSubmitting(true);
    try {
      await addLoan({
        type,
        personName: cleanName,
        amount: numericAmount,
        dueDate: hasDueDate ? dueDate.toISOString() : undefined,
        notes: notes.trim() || undefined,
      });

      hapticSuccess();
      navigation.goBack();
    } catch (err) {
      hapticError();
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 24) + spacing.xl },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header Title */}
        <View style={styles.header}>
          <Text style={styles.title}>Record Loan / Debt</Text>
          <Text style={styles.subtitle}>
            {type === "LENT"
              ? "You gave money to someone and expect it back"
              : "You borrowed money and need to repay it"}
          </Text>
        </View>

        {/* Type Selector (Lent vs Borrowed) */}
        <View style={styles.typeSelector}>
          <TouchableOpacity
            style={[
              styles.typeTab,
              type === "LENT" && styles.typeTabLentActive,
            ]}
            onPress={() => {
              hapticLight();
              setType("LENT");
            }}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons
              name="arrow-top-right"
              size={18}
              color={type === "LENT" ? colors.success : colors.textMuted}
            />
            <Text
              style={[
                styles.typeTabText,
                type === "LENT" && styles.typeTabTextLentActive,
              ]}
            >
              I Lent (Owed to Me)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.typeTab,
              type === "BORROWED" && styles.typeTabBorrowedActive,
            ]}
            onPress={() => {
              hapticLight();
              setType("BORROWED");
            }}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons
              name="arrow-bottom-left"
              size={18}
              color={type === "BORROWED" ? colors.warning : colors.textMuted}
            />
            <Text
              style={[
                styles.typeTabText,
                type === "BORROWED" && styles.typeTabTextBorrowedActive,
              ]}
            >
              I Borrowed (I Owe)
            </Text>
          </TouchableOpacity>
        </View>

        {/* Person / Counterparty Name */}
        <TextField
          label="Person / Entity Name"
          value={personName}
          onChangeText={setPersonName}
          placeholder={type === "LENT" ? "e.g. Ahmed, Usman" : "e.g. Ali, Bank Alfalah"}
          autoCapitalize="words"
        />

        {/* Amount Input */}
        <TextField
          label={`Amount (${currencySymbol})`}
          value={rawAmount}
          onChangeText={handleAmountChange}
          placeholder="0"
          keyboardType="numeric"
        />

        {/* Due Date Toggle & Picker */}
        <View style={styles.dueSection}>
          <TouchableOpacity
            style={styles.dueToggleRow}
            onPress={() => setHasDueDate(!hasDueDate)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name={hasDueDate ? "checkbox-marked" : "checkbox-blank-outline"}
              size={22}
              color={hasDueDate ? colors.accent : colors.textMuted}
            />
            <Text style={styles.dueToggleLabel}>Set a repayment due date</Text>
          </TouchableOpacity>

          {hasDueDate && (
            <View style={styles.datePickerWrap}>
              <DatePicker
                label="Due Date"
                value={dueDate}
                onChange={setDueDate}
              />
            </View>
          )}
        </View>

        {/* Optional Notes */}
        <TextField
          label="Notes (Optional)"
          value={notes}
          onChangeText={setNotes}
          placeholder="e.g. For group dinner, split rental deposit"
          maxLength={200}
        />

        {error && <Text style={styles.errorText}>{error}</Text>}

        {/* Save Button */}
        <Button
          label={type === "LENT" ? "Save Lent Record" : "Save Borrowed Record"}
          onPress={handleSave}
          loading={isSubmitting}
          style={styles.submitButton}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md },
  header: { marginBottom: spacing.xs },
  title: { ...typography.title, fontSize: 24 },
  subtitle: { ...typography.caption, color: colors.textSecondary, marginTop: 4 },
  typeSelector: {
    flexDirection: "row",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    padding: 4,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: spacing.md - 2,
    borderRadius: radius.md,
  },
  typeTabLentActive: {
    backgroundColor: colors.successMuted,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.4)",
  },
  typeTabBorrowedActive: {
    backgroundColor: colors.warningMuted,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.4)",
  },
  typeTabText: {
    ...typography.small,
    color: colors.textMuted,
    fontWeight: "600",
  },
  typeTabTextLentActive: {
    color: colors.success,
    fontWeight: "700",
  },
  typeTabTextBorrowedActive: {
    color: colors.warning,
    fontWeight: "700",
  },
  dueSection: {
    gap: spacing.xs,
  },
  dueToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  dueToggleLabel: {
    ...typography.body,
    fontSize: 14,
    color: colors.textSecondary,
  },
  datePickerWrap: {
    marginTop: spacing.xs,
  },
  errorText: {
    color: colors.danger,
    ...typography.caption,
  },
  submitButton: {
    marginTop: spacing.sm,
  },
});
