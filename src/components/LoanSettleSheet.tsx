import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { amountSchema, check, parseAmount } from "../utils/validation";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BottomSheet } from "./BottomSheet";
import { TextField } from "./TextField";
import { Button } from "./Button";
import { MoneyText } from "./MoneyText";
import { DatePicker } from "./DatePicker";
import { colors } from "../theme/colors";
import { radius, size, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { formatCurrency, formatAmountInput } from "../utils/currency";
import { formatDate } from "../utils/date";
import { Loan, PaymentOptions, loanDate } from "../types/models";
import { getErrorMessage } from "../api/client";
import { feedbackSettled, hapticDelete, hapticError, hapticLight } from "../utils/haptics";

/** A 20pt icon plus 14 on every side: the 48pt minimum target (W13, B6). */
const ICON_HIT_SLOP = 14;
/** The checkbox icon's size; the hint under it lines up with its label. */
const CHECKBOX_SIZE = 22;

interface LoanSettleSheetProps {
  loan: Loan | null;
  onClose: () => void;
  onSettle: (loanId: string, amount?: number, options?: PaymentOptions) => Promise<void>;
  /** Undoes one repayment. The sheet stays open. */
  onRemovePayment: (loanId: string, paymentId: string) => Promise<void>;
  onDelete: (loanId: string) => void;
  /** Opens the loan form for this loan, or the expense form for a loan that came from an expense. */
  onEdit: (loan: Loan) => void;
}

/** Today at noon, as the date picker saves any picked day (D-63). */
function todayAtNoon() {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return today;
}

export function LoanSettleSheet({ loan, onClose, onSettle, onRemovePayment, onDelete, onEdit }: LoanSettleSheetProps) {
  const [partialAmount, setPartialAmount] = useState("");
  // When the money changed hands: today unless the user says otherwise.
  const [paidOn, setPaidOn] = useState<Date>(todayAtNoon);
  // Forgiven, paid in kind, or offset: the debt goes down, the cash doesn't move.
  const [noCash, setNoCash] = useState(false);
  // Which button is working, so only that one spins (W13). Both are disabled meanwhile.
  const [submitting, setSubmitting] = useState<"full" | "partial" | null>(null);
  const [error, setError] = useState<string | null>(null);
  // A payment's remove asks once, in its own row (a dialog would open under the sheet).
  const [confirmingPayment, setConfirmingPayment] = useState<string | null>(null);
  const [removingPayment, setRemovingPayment] = useState<string | null>(null);

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
    setPaidOn(todayAtNoon());
    setNoCash(false);
    setError(null);
    setConfirmingPayment(null);
  }, [loan?.id]);

  const isLent = shown?.type === "LENT";
  const remaining = shown ? Math.max(0, shown.amount - shown.settledAmount) : 0;
  const isSettled = !shown || shown.status === "SETTLED" || remaining <= 0;
  const payments = shown?.payments ?? [];
  const loanDay = shown ? new Date(loanDate(shown)) : undefined;

  // Under the name: what the loan is, when that isn't plain lending.
  const context = shown?.expense
    ? ` · for ${shown.expense.description || shown.expense.category?.name || "an expense"}`
    : shown?.cashMoved === false
      ? " · didn't go through your cash"
      : "";

  const paymentOptions = (): PaymentOptions => ({ date: paidOn.toISOString(), movesCash: !noCash });

  const handleSettleFull = async () => {
    if (!shown) return;
    setSubmitting("full");
    setError(null);
    try {
      await onSettle(shown.id, undefined, paymentOptions());
      feedbackSettled();
      onClose();
    } catch (err) {
      hapticError();
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(null);
    }
  };

  const handleSettlePartial = async () => {
    if (!shown) return;
    const num = parseAmount(partialAmount);
    const problem = check(amountSchema, num);
    if (problem) {
      setError(problem);
      return;
    }
    if (num > remaining) {
      setError(`That's more than the ${formatCurrency(remaining)} left.`);
      return;
    }

    setSubmitting("partial");
    setError(null);
    try {
      await onSettle(shown.id, num, paymentOptions());
      feedbackSettled();
      onClose();
    } catch (err) {
      hapticError();
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(null);
    }
  };

  const removePayment = async (paymentId: string) => {
    if (!shown) return;
    hapticDelete();
    setRemovingPayment(paymentId);
    setError(null);
    try {
      await onRemovePayment(shown.id, paymentId);
    } catch (err) {
      hapticError();
      setError(getErrorMessage(err));
    } finally {
      setRemovingPayment(null);
      setConfirmingPayment(null);
    }
  };

  // What saving does to the user's cash, in words, so the choice is never a guess.
  const effect = noCash
    ? "Your cash doesn't change. Only what's owed goes down."
    : isLent
      ? "Your cash goes up by what you were paid."
      : "Your cash goes down by what you paid.";

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
                accessibilityLabel={shown?.expense ? "Edit the expense" : "Edit loan"}
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
          <Text style={styles.asOfToday}>As of today{context}</Text>
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

        {/* Each payment, removable: a wrong one is undone here instead of deleting the loan. */}
        {payments.length > 0 ? (
          <View style={styles.payments}>
            {payments.map((p) => (
              <View key={p.id} style={styles.paymentRow}>
                <Text style={styles.paymentText} numberOfLines={1}>
                  {formatDate(p.date)} · {formatCurrency(p.amount)}
                  {p.movesCash ? "" : " · no cash"}
                </Text>
                {confirmingPayment === p.id ? (
                  <View style={styles.paymentConfirm}>
                    <TouchableOpacity
                      onPress={() => setConfirmingPayment(null)}
                      hitSlop={ICON_HIT_SLOP}
                      accessibilityRole="button"
                    >
                      <Text style={styles.paymentKeep}>Keep</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => void removePayment(p.id)}
                      disabled={removingPayment !== null}
                      hitSlop={ICON_HIT_SLOP}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove the payment of ${formatCurrency(p.amount)}`}
                    >
                      <Text style={styles.paymentRemove}>{removingPayment === p.id ? "Removing…" : "Remove"}</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={() => {
                      hapticLight();
                      setConfirmingPayment(p.id);
                    }}
                    hitSlop={ICON_HIT_SLOP}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove the payment of ${formatCurrency(p.amount)} on ${formatDate(p.date)}`}
                  >
                    <MaterialCommunityIcons name="close" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        ) : null}

        {error ? (
          <Text style={styles.errorText} accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}

        {/* Actions if not fully settled */}
        {!isSettled ? (
          <View style={styles.actionSection}>
            <Text style={styles.actionSectionTitle}>Record a payment</Text>

            <TextField
              label="Amount paid"
              placeholder="0"
              keyboardType="decimal-pad"
              value={partialAmount}
              onChangeText={(text) => setPartialAmount(formatAmountInput(text))}
            />
            {/* Never before the loan, never in the future (D-63). */}
            <DatePicker label="Paid on" value={paidOn} onChange={setPaidOn} maxDate={new Date()} minDate={loanDay} />

            <View>
              <TouchableOpacity
                style={styles.checkRow}
                onPress={() => {
                  hapticLight();
                  setNoCash(!noCash);
                }}
                activeOpacity={0.7}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: noCash }}
              >
                <MaterialCommunityIcons
                  name={noCash ? "checkbox-marked" : "checkbox-blank-outline"}
                  size={CHECKBOX_SIZE}
                  color={noCash ? colors.accent : colors.textMuted}
                />
                <Text style={styles.checkLabel}>No money changed hands (forgiven, or paid in kind)</Text>
              </TouchableOpacity>
              <Text style={styles.checkHint}>{effect}</Text>
            </View>

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
                label={noCash ? "Forgive the rest" : "Settle in full"}
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
            <MaterialCommunityIcons name="check-circle" size={20} color={colors.success} />
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
  payments: {
    gap: spacing.xs,
  },
  paymentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    minHeight: size.minTouch,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  paymentText: {
    ...typography.small,
    flexShrink: 1,
    color: colors.textSecondary,
  },
  paymentConfirm: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
  },
  paymentKeep: { ...typography.small, fontWeight: "600", color: colors.textSecondary },
  paymentRemove: { ...typography.small, fontWeight: "700", color: colors.danger },
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
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: size.minTouch,
  },
  checkLabel: {
    ...typography.small,
    flexShrink: 1,
    fontWeight: "500",
    color: colors.textSecondary,
  },
  checkHint: {
    ...typography.small,
    color: colors.textSecondary,
    marginLeft: CHECKBOX_SIZE + spacing.sm,
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
