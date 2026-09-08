import React, { useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useIncome } from "../../hooks/useIncome";
import { useAppData } from "../../context/AppDataContext";
import { useDialog } from "../../context/DialogContext";
import { getErrorMessage } from "../../api/client";
import { Card } from "../../components/Card";
import { MonthPicker } from "../../components/MonthPicker";
import { TextField } from "../../components/TextField";
import { Button } from "../../components/Button";
import { EmptyState } from "../../components/EmptyState";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { formatCurrency } from "../../utils/currency";
import { formatMonthLabel } from "../../utils/date";

export function IncomeScreen() {
  const insets = useSafeAreaInsets();
  const { selectedMonth } = useAppData();
  const [activeMonth, setActiveMonth] = useState(selectedMonth);
  const { data: incomes, isLoading, saveIncome } = useIncome();
  const { showToast } = useDialog();

  const [salary, setSalary] = useState("");
  const [bonus, setBonus] = useState("");
  const [otherIncome, setOtherIncome] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const existing = incomes?.find((i) => i.month === activeMonth);

  useEffect(() => {
    if (existing) {
      setSalary(existing.salary > 0 ? String(existing.salary) : "");
      setBonus(existing.bonus > 0 ? String(existing.bonus) : "");
      setOtherIncome(existing.otherIncome > 0 ? String(existing.otherIncome) : "");
    } else {
      setSalary("");
      setBonus("");
      setOtherIncome("");
    }
  }, [activeMonth, existing]);

  const numSalary = Number(salary || 0);
  const numBonus = Number(bonus || 0);
  const numOther = Number(otherIncome || 0);
  const totalMonthlyIncome = numSalary + numBonus + numOther;

  const handleSave = async () => {
    if (totalMonthlyIncome <= 0) return setError("Enter at least one income stream");

    setError(null);
    setIsSaving(true);
    try {
      await saveIncome({
        month: activeMonth,
        salary: numSalary,
        bonus: numBonus,
        otherIncome: numOther,
      });
      showToast({ message: `Income saved for ${formatMonthLabel(activeMonth)}`, type: "success" });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const historyIncomes = (incomes ?? []).filter((i) => i.month !== activeMonth);

  return (
    <View style={styles.container}>
      <FlatList
        data={historyIncomes}
        keyExtractor={(item) => item.id}
        refreshing={isLoading}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: 80 + Math.max(insets.bottom, 16) },
        ]}
        ListHeaderComponent={
          <>
            {/* Month Selector Capsule */}
            <View style={{ marginBottom: spacing.md }}>
              <MonthPicker month={activeMonth} onChange={setActiveMonth} />
            </View>

            {/* Total Monthly Income Display */}
            <Card style={styles.summaryCard}>
              <View style={styles.summaryTop}>
                <View style={styles.badge}>
                  <View style={styles.badgeDot} />
                  <Text style={styles.badgeText}>TOTAL MONTHLY INCOME</Text>
                </View>
                <Text style={styles.monthTag}>{formatMonthLabel(activeMonth)}</Text>
              </View>
              <Text style={styles.summaryAmount} numberOfLines={1} adjustsFontSizeToFit>
                {formatCurrency(totalMonthlyIncome)}
              </Text>
            </Card>

            {/* Income Streams Form */}
            <Card style={styles.form}>
              <Text style={styles.formTitle}>Income Streams</Text>

              {/* Stream 1: Primary Salary */}
              <View style={styles.streamRow}>
                <View style={[styles.streamIconWrap, { backgroundColor: "rgba(0, 230, 118, 0.12)" }]}>
                  <MaterialCommunityIcons name="briefcase-outline" size={20} color={colors.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <TextField
                    label="Primary Salary (Job / Business)"
                    keyboardType="decimal-pad"
                    value={salary}
                    onChangeText={setSalary}
                    placeholder="0"
                    style={styles.fieldOverride}
                  />
                </View>
              </View>

              {/* Stream 2: Performance Bonus / Commission */}
              <View style={styles.streamRow}>
                <View style={[styles.streamIconWrap, { backgroundColor: "rgba(124, 77, 255, 0.12)" }]}>
                  <MaterialCommunityIcons name="gift-outline" size={20} color="#B388FF" />
                </View>
                <View style={{ flex: 1 }}>
                  <TextField
                    label="Bonus & Commission"
                    keyboardType="decimal-pad"
                    value={bonus}
                    onChangeText={setBonus}
                    placeholder="0"
                    style={styles.fieldOverride}
                  />
                </View>
              </View>

              {/* Stream 3: Other Income / Freelance / Rental */}
              <View style={styles.streamRow}>
                <View style={[styles.streamIconWrap, { backgroundColor: "rgba(255, 179, 0, 0.12)" }]}>
                  <MaterialCommunityIcons name="laptop" size={20} color={colors.warning} />
                </View>
                <View style={{ flex: 1 }}>
                  <TextField
                    label="Other (Freelance / Investments / Rental)"
                    keyboardType="decimal-pad"
                    value={otherIncome}
                    onChangeText={setOtherIncome}
                    placeholder="0"
                    style={styles.fieldOverride}
                  />
                </View>
              </View>

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <Button
                label={existing ? `Update ${formatMonthLabel(activeMonth)}` : `Save ${formatMonthLabel(activeMonth)}`}
                onPress={handleSave}
                loading={isSaving}
                style={{ marginTop: spacing.xs }}
              />
            </Card>

            {historyIncomes.length > 0 && (
              <Text style={styles.sectionTitle}>Other Months History</Text>
            )}
          </>
        }
        ListEmptyComponent={
          !isLoading && historyIncomes.length === 0 ? (
            <EmptyState icon="cash-multiple" title="No other months logged yet" />
          ) : null
        }
        renderItem={({ item }) => (
          <Card style={styles.historyRow}>
            <View>
              <Text style={styles.historyMonth}>{formatMonthLabel(item.month)}</Text>
              <Text style={styles.historyBreakdown}>
                Salary: {formatCurrency(item.salary)}
                {item.bonus > 0 ? ` · Bonus: ${formatCurrency(item.bonus)}` : ""}
                {item.otherIncome > 0 ? ` · Other: ${formatCurrency(item.otherIncome)}` : ""}
              </Text>
            </View>
            <Text style={styles.historyTotal}>
              {formatCurrency(item.salary + item.bonus + item.otherIncome)}
            </Text>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.sm },

  // Summary Card
  summaryCard: {
    marginBottom: spacing.md,
    backgroundColor: colors.surfaceRaised,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md + 4,
    gap: 4,
  },
  summaryTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textSecondary,
    letterSpacing: 0.6,
  },
  monthTag: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.accent,
  },
  summaryAmount: {
    fontSize: 32,
    fontWeight: "800",
    color: colors.textPrimary,
    letterSpacing: -0.5,
    marginTop: 2,
  },

  // Form Card
  form: { marginBottom: spacing.lg },
  formTitle: { ...typography.subtitle, fontSize: 18, fontWeight: "700", marginBottom: spacing.md },
  streamRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm + 2,
    marginBottom: 2,
  },
  streamIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 26,
  },
  fieldOverride: {
    height: 48,
  },
  error: { color: colors.danger, marginBottom: spacing.md, fontSize: 13 },

  sectionTitle: {
    ...typography.subtitle,
    fontSize: 16,
    fontWeight: "700",
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    marginTop: spacing.xs,
  },
  historyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  historyMonth: { ...typography.body, fontWeight: "700" },
  historyBreakdown: { ...typography.small, color: colors.textMuted, marginTop: 2 },
  historyTotal: { ...typography.body, fontWeight: "800", color: colors.accent },
});
