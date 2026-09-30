import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { BottomSheet } from "../BottomSheet";
import { Button } from "../Button";
import { CashAvailable } from "../../types/models";
import { formatCurrency, formatCurrencySpoken } from "../../utils/currency";
import { formatMonthShort } from "../../utils/date";
import { heroLabel } from "../../utils/homeText";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

/**
 * How Cash available is worked out (R-35): this month's story, from the cash at the start of the
 * month to the figure on Home. Rows that are 0 are left out.
 */
export function CashBreakdownSheet({
  cash,
  month,
  visible,
  onClose,
  onEditOpening,
  onHidden,
}: {
  cash: CashAvailable | null;
  month: string;
  visible: boolean;
  onClose: () => void;
  onEditOpening: () => void;
  /** After the exit animation, for opening the next sheet. */
  onHidden?: () => void;
}) {
  // Kept while the sheet animates out, so it closes rather than going blank (ui-review §7.4).
  const [shown, setShown] = useState(cash);
  useEffect(() => {
    if (cash) setShown(cash);
  }, [cash]);
  if (!shown) return <BottomSheet visible={false} onClose={onClose}>{null}</BottomSheet>;

  const b = shown.breakdown;
  const rows: [string, number, "+" | "−" | ""][] = [
    [`Cash at start of ${formatMonthShort(month)}`, b.startOfMonth, ""],
    ["Income", b.income, "+"],
    ["Borrowed", b.borrowed, "+"],
    ["Paid back to you", b.collected, "+"],
    ["Expenses", b.expenses, "−"],
    ["Lent", b.lent, "−"],
    ["You paid back", b.repaid, "−"],
  ];

  return (
    <BottomSheet visible={visible} onClose={onClose} onHidden={onHidden}>
      <View style={styles.content}>
        <Text style={styles.title}>How this adds up</Text>
        {rows
          .filter(([, amount], i) => i === 0 || amount !== 0)
          .map(([label, amount, sign]) => (
            <View
              key={label}
              style={styles.row}
              accessible
              accessibilityLabel={`${sign === "+" ? "plus " : sign === "−" ? "minus " : ""}${label}, ${formatCurrencySpoken(amount)}`}
            >
              <Text style={styles.label}>{sign ? `${sign} ${label}` : label}</Text>
              <Text style={styles.amount}>{formatCurrency(amount)}</Text>
            </View>
          ))}
        <View style={[styles.row, styles.totalRow]} accessible accessibilityLabel={`${heroLabel(shown.period, month)}, ${formatCurrencySpoken(shown.amount)}`}>
          <Text style={styles.totalLabel}>= {heroLabel(shown.period, month)}</Text>
          <Text style={styles.totalAmount}>{formatCurrency(shown.amount)}</Text>
        </View>
        {shown.period === "current" ? (
          <Text style={styles.footnote}>Entries dated later this month aren't counted yet.</Text>
        ) : null}
        {/* While it's unset, Home's prompt is the one way in (§5.2). */}
        {shown.openingBalance !== null ? (
          <Button label="Update opening cash" variant="secondary" onPress={onEditOpening} />
        ) : null}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.sm, paddingBottom: spacing.md },
  title: { ...typography.subtitle, color: colors.textPrimary, marginBottom: spacing.xs },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.md },
  label: { ...typography.body, color: colors.textSecondary, flexShrink: 1 },
  amount: { ...typography.body, color: colors.textPrimary },
  totalRow: { borderTopWidth: 1, borderTopColor: colors.borderLight, paddingTop: spacing.sm, marginTop: spacing.xs },
  totalLabel: { ...typography.body, fontWeight: "700", color: colors.textPrimary, flexShrink: 1 },
  totalAmount: { ...typography.body, fontWeight: "700", color: colors.textPrimary },
  footnote: { ...typography.small, color: colors.textSecondary, marginBottom: spacing.sm },
});
