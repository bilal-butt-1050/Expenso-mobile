import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BottomSheet } from "./BottomSheet";
import { TextField } from "./TextField";
import { Button } from "./Button";
import { MoneyText } from "./MoneyText";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { formatCurrency, formatAmountInput } from "../utils/currency";
import { Loan } from "../types/models";
import { getErrorMessage } from "../api/client";
import { hapticSuccess } from "../utils/haptics";

/** A 20pt icon plus 14 on every side: the 48pt minimum target (W13, B6). */
const ICON_HIT_SLOP = 14;

interface LoanSettleSheetProps {
  loan: Loan | null;
  onClose: () => void;
  onSettle: (loanId: string, amount?: number) => Promise<void>;
  onDelete: (loanId: string) => void;
  /** Opens the loan form for this loan (R-29). */
  onEdit: (loan: Loan) => void;
}

export function LoanSettleSheet({
  loan,
  onClose,
  onSettle,
  onDelete,
  onEdit,
}: LoanSettleSheetProps) {
  const [partialAmount, setPartialAmount] = useState("");
  // Which button is working, so only that one spins (W13). Both are disabled meanwhile.
  const [submitting, setSubmitting] = useState<"full" | "partial" | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Retain the last loan so the sheet still has something to render while it animates out.
  // It used to `return null` the moment `loan` went null, so it vanished instead of closing.
  const [shown, setShown] = useState<Loan | null>(loan);
  // Edit opens a stack screen, which must wait until this sheet has finished closing (minor 6).
  const pendingEdit = useRef<Loan | null>(null);
  useEffect(() => {
    if (loan) setShown(loan);
  }, [loan]);

  // Reset per loan. These hooks sit above the old early return, so state survived between
  // loans — opening one, typing a partial amount, closing, then opening another showed the
  // first loan's figure still in the field.
  useEffect(() => {
    setPartialAmount("");
    setError(null);
  }, [loan?.id]);

  const isLent = shown?.type === "LENT";
  const remaining = shown ? Math.max(0, shown.amount - shown.settledAmount) : 0;
  const isSettled = !shown || shown.status === "SETTLED" || remaining <= 0;

  const handleSettleFull = async () => {
    if (!shown) return;
    setSubmitting("full");
    setError(null);
    try {
      await onSettle(shown.id);
      hapticSuccess();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(null);
    }
  };

  const handleSettlePartial = async () => {
    if (!shown) return;
    const num = parseFloat(partialAmount.replace(/,/g, ""));
    if (isNaN(num) || num <= 0) {
      setError("Enter an amount greater than 0.");
      return;
    }
    if (num > remaining) {
      setError(`That's more than the ${formatCurrency(remaining)} left.`);
      return;
    }

    setSubmitting("partial");
    setError(null);
    try {
      await onSettle(shown.id, num);
      hapticSuccess();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <BottomSheet
      visible={!!loan}
      onClose={onClose}
      onHidden={() => {
        const loanToEdit = pendingEdit.current;
        pendingEdit.current = null;
        if (loanToEdit) onEdit(loanToEdit);
      }}
    >
      {/* Rendered even while `loan` is null so the sheet can play its exit animation. It used
          to `return null` before this point, so it simply vanished. */}
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            {/* One colour per loan direction, never green/red (D-59, W4). */}
            <View style={[styles.typeTag, isLent ? styles.lentTag : styles.borrowedTag]}>
              <Text style={[styles.typeTagText, isLent ? styles.lentText : styles.borrowedText]}>
                {isLent ? "Money lent" : "Money borrowed"}
              </Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity
                onPress={() => {
                  pendingEdit.current = shown;
                  onClose();
                }}
                hitSlop={ICON_HIT_SLOP}
                accessibilityRole="button"
                accessibilityLabel="Edit loan"
              >
                <MaterialCommunityIcons name="pencil-outline" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  onClose();
                  if (shown) onDelete(shown.id);
                }}
                hitSlop={ICON_HIT_SLOP}
                accessibilityRole="button"
                accessibilityLabel="Delete loan"
              >
                <MaterialCommunityIcons name="trash-can-outline" size={20} color={colors.danger} />
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.personName}>{shown?.personName}</Text>
          {/* Opened from any month, the sheet always shows and acts on today's loan (D-63). */}
          <Text style={styles.asOfToday}>As of today</Text>
          {shown?.notes ? <Text style={styles.notes}>{shown.notes}</Text> : null}
        </View>

        {/* Balance breakdown */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceCol}>
            <Text style={styles.balanceLabel}>Total</Text>
            <MoneyText amount={shown?.amount ?? 0} style={styles.balanceVal} />
          </View>
          <View style={styles.balanceDivider} />
          <View style={styles.balanceCol}>
            <Text style={styles.balanceLabel}>Settled</Text>
            <MoneyText amount={shown?.settledAmount ?? 0} style={[styles.balanceVal, styles.settledVal]} />
          </View>
          <View style={styles.balanceDivider} />
          <View style={styles.balanceCol}>
            <Text style={styles.balanceLabel}>Remaining</Text>
            <MoneyText
              amount={remaining}
              style={[styles.balanceVal, isSettled ? styles.remainingDone : styles.remainingOpen]}
            />
          </View>
        </View>

        {/* Actions if not fully settled */}
        {!isSettled ? (
          <View style={styles.actionSection}>
            <Text style={styles.actionSectionTitle}>Record a payment</Text>

            {error ? (
              <Text style={styles.errorText} accessibilityLiveRegion="polite">
                {error}
              </Text>
            ) : null}

            <TextField
              label="Amount paid"
              placeholder="0"
              keyboardType="decimal-pad"
              value={partialAmount}
              onChangeText={(text) => setPartialAmount(formatAmountInput(text))}
            />

            <View style={styles.buttonsRow}>
              {partialAmount.trim().length > 0 && (
                <Button
                  label="Save payment"
                  variant="secondary"
                  onPress={handleSettlePartial}
                  loading={submitting === "partial"}
                  disabled={submitting !== null}
                  style={styles.flexBtn}
                />
              )}
              {/* The amount is the Remaining figure just above, so the label stays short (W13). */}
              <Button
                label="Settle in full"
                variant="primary"
                onPress={handleSettleFull}
                loading={submitting === "full"}
                disabled={submitting !== null}
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
    gap: spacing.xs,
  },
  asOfToday: {
    ...typography.small,
    color: colors.textSecondary,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xl,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  typeTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  lentTag: { backgroundColor: colors.lentMuted },
  borrowedTag: { backgroundColor: colors.borrowedMuted },
  typeTagText: {
    ...typography.small,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  lentText: { color: colors.lent },
  borrowedText: { color: colors.borrowed },
  personName: {
    ...typography.subtitle,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  notes: {
    ...typography.caption,
    color: colors.textMuted,
  },
  // A grouped card inside the raised sheet: `surface`, 1pt `borderLight`, `radius.lg` (W5).
  balanceCard: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
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
    ...typography.small,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    marginBottom: spacing.xs,
  },
  balanceVal: {
    ...typography.caption,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  settledVal: { color: colors.success },
  remainingOpen: { color: colors.accent },
  remainingDone: { color: colors.textMuted },
  actionSection: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  actionSectionTitle: {
    ...typography.small,
    fontWeight: "700",
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  errorText: {
    ...typography.small,
    fontWeight: "400",
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
    backgroundColor: colors.successMuted,
    borderRadius: radius.lg,
    marginTop: spacing.xs,
  },
  settledBadgeText: {
    ...typography.small,
    fontWeight: "600",
    color: colors.success,
  },
});
