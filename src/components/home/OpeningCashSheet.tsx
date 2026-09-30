import React, { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { StyleSheet, Text, View } from "react-native";
import { onlineManager } from "@tanstack/react-query";
import { BottomSheet } from "../BottomSheet";
import { Button } from "../Button";
import { TextField } from "../TextField";
import { useOpeningBalance } from "../../hooks/useOpeningBalance";
import { usePendingWriteCount } from "../../lib/onlineStatus";
import { getErrorMessage } from "../../api/client";
import { formatAmountInput, formatCurrency } from "../../utils/currency";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

/** An amount field's text, keeping a leading minus: what you have can be overdrawn. */
function formatSignedAmountInput(text: string): string {
  const negative = text.trim().startsWith("-");
  const digits = formatAmountInput(text);
  return negative ? `-${digits}` : digits;
}

/**
 * "What do you have right now?" (R-34, D-63). The server stores the opening cash that makes
 * today's figure equal the answer, so the user never has to reconstruct what they had months ago.
 * Mount with a new `key` per opening so the field starts from today's figure.
 */
export function OpeningCashSheet({
  visible,
  onClose,
  cashToday,
  openingBalance,
}: {
  visible: boolean;
  onClose: () => void;
  /** Today's Cash available (the current month's), to pre-fill and to show the result. */
  cashToday: number | null;
  openingBalance: number | null;
}) {
  const { save, isSaving } = useOpeningBalance();
  const online = useSyncExternalStore(onlineManager.subscribe, () => onlineManager.isOnline());
  const pendingWrites = usePendingWriteCount();
  const [value, setValue] = useState(cashToday !== null ? formatSignedAmountInput(String(Math.round(cashToday))) : "");
  const [error, setError] = useState<string | null>(null);
  // If today's figure arrives after the sheet opened, fill it in, unless the user has typed.
  const touched = useRef(false);
  useEffect(() => {
    if (!touched.current && cashToday !== null) setValue(formatSignedAmountInput(String(Math.round(cashToday))));
  }, [cashToday]);

  const parsed = Number(value.replace(/,/g, ""));
  const valid = value.trim() !== "" && value.trim() !== "-" && Number.isFinite(parsed);
  // What the entries add up to without any opening cash, so the result can be shown as you type.
  const ledger = cashToday !== null ? cashToday - (openingBalance ?? 0) : null;
  // Saving needs a fresh figure: offline, or with changes still waiting to sync, it would be stale.
  const blockedReason = !online
    ? "You're offline. Connect to set your opening cash."
    : pendingWrites > 0
      ? "Some changes are still syncing. Try again in a moment."
      : null;

  const handleSave = async () => {
    if (!valid) {
      setError("Enter an amount");
      return;
    }
    setError(null);
    try {
      await save(parsed);
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.content}>
        <Text style={styles.title}>What do you have right now?</Text>
        <Text style={styles.helper}>
          All your cash and bank money together. We'll work out your opening cash from it; it isn't income.
        </Text>
        <TextField
          label="Money you have today"
          value={value}
          onChangeText={(text) => {
            touched.current = true;
            setValue(formatSignedAmountInput(text));
          }}
          keyboardType="numeric"
          placeholder="0"
          autoFocus
          error={error}
        />
        {valid && ledger !== null ? (
          <Text style={styles.preview}>Your opening cash becomes {formatCurrency(parsed - ledger)}</Text>
        ) : null}
        {blockedReason ? <Text style={styles.blocked}>{blockedReason}</Text> : null}
        <View style={styles.actions}>
          <Button label="Cancel" variant="secondary" onPress={onClose} style={styles.action} />
          <Button
            label="Save"
            onPress={handleSave}
            loading={isSaving}
            disabled={!!blockedReason}
            style={styles.action}
          />
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.sm, paddingBottom: spacing.md },
  title: { ...typography.subtitle, color: colors.textPrimary },
  helper: { ...typography.caption, color: colors.textSecondary },
  preview: { ...typography.small, color: colors.textSecondary },
  blocked: { ...typography.small, color: colors.warning },
  actions: { flexDirection: "row", gap: spacing.md, marginTop: spacing.sm },
  action: { flex: 1 },
});
