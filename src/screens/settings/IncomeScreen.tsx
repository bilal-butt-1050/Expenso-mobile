import React, { useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { useIncome } from "../../hooks/useIncome";
import { getErrorMessage } from "../../api/client";
import { Card } from "../../components/Card";
import { TextField } from "../../components/TextField";
import { Button } from "../../components/Button";
import { EmptyState } from "../../components/EmptyState";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { formatCurrency } from "../../utils/currency";
import { currentMonthKey, formatMonthLabel } from "../../utils/date";

export function IncomeScreen() {
  const { data: incomes, isLoading, saveIncome } = useIncome();
  const [salary, setSalary] = useState("");
  const [bonus, setBonus] = useState("");
  const [otherIncome, setOtherIncome] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const thisMonth = currentMonthKey();
  const existing = incomes?.find((i) => i.month === thisMonth);

  const handleSave = async () => {
    const parsedSalary = Number(salary || existing?.salary || 0);
    if (parsedSalary <= 0) return setError("Enter your salary for this month");

    setError(null);
    setIsSaving(true);
    try {
      await saveIncome({
        month: thisMonth,
        salary: parsedSalary,
        bonus: Number(bonus || existing?.bonus || 0),
        otherIncome: Number(otherIncome || existing?.otherIncome || 0),
      });
      setSalary("");
      setBonus("");
      setOtherIncome("");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={incomes ?? []}
        keyExtractor={(item) => item.id}
        refreshing={isLoading}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <Card style={styles.form}>
            <Text style={styles.formTitle}>{formatMonthLabel(thisMonth)}</Text>
            <TextField
              label="Salary"
              keyboardType="decimal-pad"
              value={salary}
              onChangeText={setSalary}
              placeholder={existing ? String(existing.salary) : "0"}
            />
            <TextField
              label="Bonus"
              keyboardType="decimal-pad"
              value={bonus}
              onChangeText={setBonus}
              placeholder={existing ? String(existing.bonus) : "0"}
            />
            <TextField
              label="Other Income"
              keyboardType="decimal-pad"
              value={otherIncome}
              onChangeText={setOtherIncome}
              placeholder={existing ? String(existing.otherIncome) : "0"}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button label={existing ? "Update This Month" : "Save This Month"} onPress={handleSave} loading={isSaving} />
          </Card>
        }
        ListEmptyComponent={
          !isLoading ? <EmptyState icon="cash-multiple" title="No income logged yet" /> : null
        }
        renderItem={({ item }) => (
          <Card style={styles.historyRow}>
            <Text style={styles.historyMonth}>{formatMonthLabel(item.month)}</Text>
            <Text style={styles.historyTotal}>{formatCurrency(item.salary + item.bonus + item.otherIncome)}</Text>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.sm },
  form: { marginBottom: spacing.lg },
  formTitle: { ...typography.subtitle, marginBottom: spacing.md },
  error: { color: colors.danger, marginBottom: spacing.md, fontSize: 13 },
  historyRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.sm },
  historyMonth: { ...typography.body },
  historyTotal: { ...typography.body, fontWeight: "700" },
});
