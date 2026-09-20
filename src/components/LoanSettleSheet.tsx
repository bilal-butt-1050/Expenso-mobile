import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BottomSheet } from "./BottomSheet";
import { TextField } from "./TextField";
import { Button } from "./Button";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { formatCurrency, formatAmountInput } from "../utils/currency";
import { Loan } from "../types/models";
import { hapticLight, hapticSuccess } from "../utils/haptics";

interface LoanSettleSheetProps {
  loan: Loan | null;
  onClose: () => void;
  onSettle: (loanId: string, amount?: number) => Promise<void>;
  onDelete: (loanId: string) => void;
}

export function LoanSettleSheet({
  loan,
  onClose,
  onSettle,
  onDelete,
}: LoanSettleSheetProps) {
  const [partialAmount, setPartialAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!loan) return null;

  const isLent = loan.type === "LENT";
  const remaining = Math.max(0, loan.amount - loan.settledAmount);
  const isSettled = loan.status === "SETTLED" || remaining <= 0;

  const handleSettleFull = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await onSettle(loan.id);
      hapticSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to settle loan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSettlePartial = async () => {
    const num = parseFloat(partialAmount.replace(/,/g, ""));
    if (isNaN(num) || num <= 0) {
      setError("Please enter a valid amount greater than 0");
      return;
    }
    if (num > remaining) {
      setError(`Amount cannot exceed remaining balance of ${formatCurrency(remaining)}`);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onSettle(loan.id, num);
      hapticSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to record payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BottomSheet visible={!!loan} onClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <View
              style={[
                styles.typeTag,
                {
                  backgroundColor: isLent
                    ? "rgba(16, 185, 129, 0.12)"
                    : "rgba(239, 68, 68, 0.12)",
                },
              ]}
            >
              <Text
                style={[
                  styles.typeTagText,
                  { color: isLent ? colors.success : colors.danger },
                ]}
              >
                {isLent ? "MONEY LENT" : "MONEY BORROWED"}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                onClose();
                onDelete(loan.id);
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialCommunityIcons
                name="trash-can-outline"
                size={20}
                color={colors.danger}
              />
            </TouchableOpacity>
          </View>

          <Text style={styles.personName}>{loan.personName}</Text>
          {loan.notes ? <Text style={styles.notes}>{loan.notes}</Text> : null}
        </View>

        {/* Balance Breakdown */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceCol}>
            <Text style={styles.balanceLabel}>TOTAL</Text>
            <Text style={styles.balanceVal}>{formatCurrency(loan.amount)}</Text>
          </View>
          <View style={styles.balanceDivider} />
          <View style={styles.balanceCol}>
            <Text style={styles.balanceLabel}>SETTLED</Text>
            <Text style={[styles.balanceVal, { color: colors.success }]}>
              {formatCurrency(loan.settledAmount)}
            </Text>
          </View>
          <View style={styles.balanceDivider} />
          <View style={styles.balanceCol}>
            <Text style={styles.balanceLabel}>REMAINING</Text>
            <Text style={[styles.balanceVal, { color: isSettled ? colors.textMuted : colors.accent }]}>
              {formatCurrency(remaining)}
            </Text>
          </View>
        </View>

        {/* Actions if not fully settled */}
        {!isSettled ? (
          <View style={styles.actionSection}>
            <Text style={styles.actionSectionTitle}>Record Settlement / Payment</Text>

            {error && <Text style={styles.errorText}>{error}</Text>}

            <TextField
              label="Partial Amount"
              placeholder="0.00"
              keyboardType="numeric"
              value={partialAmount}
              onChangeText={(text) => setPartialAmount(formatAmountInput(text))}
            />

            <View style={styles.buttonsRow}>
              {partialAmount.trim().length > 0 && (
                <Button
                  label="Pay Partial"
                  variant="secondary"
                  onPress={handleSettlePartial}
                  loading={isSubmitting}
                  style={styles.flexBtn}
                />
              )}
              <Button
                label={`Settle in Full (${formatCurrency(remaining)})`}
                variant="primary"
                onPress={handleSettleFull}
                loading={isSubmitting}
                style={styles.flexBtn}
              />
            </View>
          </View>
        ) : (
          <View style={styles.settledBadge}>
            <MaterialCommunityIcons
              name="check-circle"
              size={20}
              color={colors.success}
            />
            <Text style={styles.settledBadgeText}>This loan is fully settled</Text>
          </View>
        )}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  header: {
    gap: 4,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  typeTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeTagText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  personName: {
    ...typography.title,
    fontSize: 22,
    color: colors.textPrimary,
  },
  notes: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  balanceCard: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: 14,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  balanceCol: {
    flex: 1,
    alignItems: "center",
  },
  balanceDivider: {
    width: 1,
    backgroundColor: colors.borderLight,
  },
  balanceLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.textMuted,
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  balanceVal: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  actionSection: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  actionSectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  errorText: {
    fontSize: 13,
    color: colors.danger,
  },
  buttonsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  flexBtn: {
    flex: 1,
  },
  settledBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    backgroundColor: "rgba(16, 185, 129, 0.08)",
    borderRadius: 14,
    marginTop: spacing.xs,
  },
  settledBadgeText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.success,
  },
});
