import React, { useState } from "react";
import { FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useDashboard } from "../../hooks/useDashboard";
import { useBudgets } from "../../hooks/useBudgets";
import { useCategories } from "../../hooks/useCategories";
import { ScreenContainer } from "../../components/ScreenContainer";
import { Card } from "../../components/Card";
import { ProgressBar } from "../../components/ProgressBar";
import { CategoryPill } from "../../components/CategoryPill";
import { TextField } from "../../components/TextField";
import { Button } from "../../components/Button";
import { EmptyState } from "../../components/EmptyState";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { formatCurrency } from "../../utils/currency";
import { formatMonthLabel } from "../../utils/date";
import { Category } from "../../types/models";
import { useAppData } from "../../context/AppDataContext";

export function BudgetScreen() {
  const { selectedMonth } = useAppData();
  const { data: summary, isLoading } = useDashboard();
  const { data: categories } = useCategories();
  const { setBudget } = useBudgets();
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const rows = (categories ?? []).map((category) => {
    const match = summary?.budgetVsActual.find((b) => b.categoryId === category.id);
    return {
      category,
      budget: match?.budget ?? 0,
      actual: match?.actual ?? 0,
      unpaid: match?.unpaid ?? 0,
      hasBudget: Boolean(match),
    };
  });

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={typography.title}>Budget</Text>
        <Text style={styles.subtitle}>{formatMonthLabel(selectedMonth)}</Text>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(item) => item.category.id}
        refreshing={isLoading}
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        ListEmptyComponent={
          <EmptyState icon="chart-donut" title="No categories yet" subtitle="Add categories in Settings first." />
        }
        renderItem={({ item }) => {
          const progress = item.budget > 0 ? item.actual / item.budget : 0;
          return (
            <Card style={styles.row}>
              <TouchableOpacity style={styles.rowTop} onPress={() => setEditingCategory(item.category)}>
                <CategoryPill icon={item.category.icon} color={item.category.color} size={30} />
                <Text style={styles.rowLabel}>{item.category.name}</Text>
                <Text style={styles.rowAmounts}>
                  {formatCurrency(item.actual)}
                  <Text style={styles.rowBudget}> / {item.hasBudget ? formatCurrency(item.budget) : "no budget"}</Text>
                </Text>
              </TouchableOpacity>
              {item.hasBudget && (
                <View style={{ marginTop: spacing.sm }}>
                  <ProgressBar progress={progress} color={item.category.color} />
                  {item.unpaid > 0 && (
                    <Text style={styles.unpaidNote}>{formatCurrency(item.unpaid)} of this is still unpaid</Text>
                  )}
                </View>
              )}
            </Card>
          );
        }}
      />

      <Modal visible={!!editingCategory} animationType="slide" transparent onRequestClose={() => setEditingCategory(null)}>
        <BudgetEditSheet
          category={editingCategory}
          currentAmount={rows.find((r) => r.category.id === editingCategory?.id)?.budget ?? 0}
          onClose={() => setEditingCategory(null)}
          onSave={async (amount) => {
            if (editingCategory) await setBudget(editingCategory.id, amount);
            setEditingCategory(null);
          }}
        />
      </Modal>
    </ScreenContainer>
  );
}

function BudgetEditSheet({
  category,
  currentAmount,
  onClose,
  onSave,
}: {
  category: Category | null;
  currentAmount: number;
  onClose: () => void;
  onSave: (amount: number) => void;
}) {
  const [value, setValue] = useState(currentAmount ? String(currentAmount) : "");

  if (!category) return null;

  return (
    <View style={styles.sheetBackdrop}>
      <View style={styles.sheet}>
        <View style={styles.sheetHeader}>
          <CategoryPill icon={category.icon} color={category.color} />
          <Text style={styles.sheetTitle}>{category.name} budget</Text>
        </View>
        <TextField
          label="Monthly budget (PKR)"
          keyboardType="decimal-pad"
          value={value}
          onChangeText={setValue}
          autoFocus
          placeholder="0"
        />
        <View style={styles.sheetActions}>
          <Button label="Cancel" variant="secondary" onPress={onClose} style={{ flex: 1 }} />
          <Button label="Save" onPress={() => onSave(Number(value) || 0)} style={{ flex: 1 }} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: spacing.md },
  subtitle: { ...typography.caption, marginTop: 2 },
  row: { marginBottom: spacing.sm, padding: spacing.md },
  rowTop: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  rowLabel: { ...typography.body, fontWeight: "600", flex: 1 },
  rowAmounts: { ...typography.body, fontWeight: "700" },
  rowBudget: { ...typography.small, fontWeight: "400" },
  unpaidNote: { ...typography.small, color: colors.warning, marginTop: spacing.xs },
  sheetBackdrop: { flex: 1, backgroundColor: "#000000AA", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing.lg },
  sheetHeader: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.lg },
  sheetTitle: { ...typography.subtitle, color: colors.textPrimary },
  sheetActions: { flexDirection: "row", gap: spacing.md, marginTop: spacing.sm },
});
