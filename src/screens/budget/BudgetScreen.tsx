import React, { useState } from "react";
import { FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useDashboard } from "../../hooks/useDashboard";
import { useBudgets } from "../../hooks/useBudgets";
import { useCategories } from "../../hooks/useCategories";
import { ScreenContainer } from "../../components/ScreenContainer";
import { Card } from "../../components/Card";
import { MonthPicker } from "../../components/MonthPicker";
import { ProgressBar } from "../../components/ProgressBar";
import { CategoryPill } from "../../components/CategoryPill";
import { TextField } from "../../components/TextField";
import { Button } from "../../components/Button";
import { EmptyState } from "../../components/EmptyState";
import { BudgetSkeleton } from "../../components/Skeleton";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { formatCurrency } from "../../utils/currency";
import { Category } from "../../types/models";
import { useAppData } from "../../context/AppDataContext";
import { useDialog } from "../../context/DialogContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function BudgetScreen() {
  const { selectedMonth, setSelectedMonth } = useAppData();
  const { data: summary, isLoading } = useDashboard();
  const { data: categories } = useCategories();
  const { setBudget } = useBudgets();
  const { showToast } = useDialog();
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const rows = (categories ?? []).map((category) => {
    const match = summary?.budgetVsActual.find((b) => b.categoryId === category.id);
    return {
      category,
      budget: match?.budget ?? 0,
      actual: match?.actual ?? 0,
      hasBudget: Boolean(match),
    };
  });

  const totalBudgeted = rows.reduce((sum, r) => sum + r.budget, 0);
  const monthlyIncome = summary?.monthlyIncome ?? 0;
  const unallocated = monthlyIncome - totalBudgeted;

  return (
    <ScreenContainer>
      <Text style={styles.title}>Budget</Text>

      {isLoading && !summary ? (
        <BudgetSkeleton />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.category.id}
          refreshing={isLoading}
          contentContainerStyle={{ paddingBottom: spacing.xxl + 32 }}
          ListHeaderComponent={
            <>
              <View style={{ marginBottom: spacing.md }}>
                <MonthPicker month={selectedMonth} onChange={setSelectedMonth} />
              </View>

              {/* Summary */}
              <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <View style={styles.summaryCol}>
                    <Text style={styles.summaryLabel}>BUDGETED</Text>
                    <Text style={styles.summaryValue}>{formatCurrency(totalBudgeted)}</Text>
                  </View>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryCol}>
                    <Text style={styles.summaryLabel}>INCOME</Text>
                    <Text style={styles.summaryValue}>{formatCurrency(monthlyIncome)}</Text>
                  </View>
                </View>

                {monthlyIncome > 0 && (
                  <>
                    <View style={styles.trackBg}>
                      <View
                        style={[styles.trackFill, {
                          width: `${Math.min(100, (totalBudgeted / monthlyIncome) * 100)}%`,
                          backgroundColor: unallocated < 0 ? colors.danger : colors.textPrimary,
                        }]}
                      />
                    </View>
                    <Text style={styles.unallocatedText}>
                      {unallocated < 0
                        ? `Over by ${formatCurrency(Math.abs(unallocated))}`
                        : `${formatCurrency(unallocated)} unallocated`}
                    </Text>
                  </>
                )}
              </View>

              <Text style={styles.sectionTitle}>Categories</Text>
            </>
          }
          ListEmptyComponent={
            <EmptyState icon="chart-donut" title="No categories yet" />
          }
          renderItem={({ item }) => {
            const progress = item.budget > 0 ? item.actual / item.budget : 0;
            const isOver = item.actual > item.budget;

            return (
              <TouchableOpacity
                style={styles.row}
                onPress={() => setEditingCategory(item.category)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`${item.category.name}, ${formatCurrency(item.actual)} of ${formatCurrency(item.budget)}`}
              >
                <CategoryPill icon={item.category.icon} color={item.category.color} size={38} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowLabel}>{item.category.name}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.rowAmount}>{formatCurrency(item.actual)}</Text>
                  <Text style={styles.rowBudget}>
                    {item.hasBudget ? `of ${formatCurrency(item.budget)}` : "no budget"}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}

      <Modal visible={!!editingCategory} animationType="slide" transparent onRequestClose={() => setEditingCategory(null)}>
        <BudgetEditSheet
          category={editingCategory}
          currentAmount={rows.find((r) => r.category.id === editingCategory?.id)?.budget ?? 0}
          onClose={() => setEditingCategory(null)}
          onSave={async (amount) => {
            if (editingCategory) {
              await setBudget(editingCategory.id, amount);
              showToast({ message: `${editingCategory.name} budget updated`, type: "success" });
            }
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
  const insets = useSafeAreaInsets();
  const [value, setValue] = useState(currentAmount ? String(currentAmount) : "");

  if (!category) return null;

  return (
    <View style={styles.sheetBackdrop}>
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.md }]}>
        <View style={styles.sheetHeader}>
          <CategoryPill icon={category.icon} color={category.color} size={38} />
          <Text style={styles.sheetTitle}>{category.name}</Text>
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
  title: { ...typography.title, marginTop: spacing.lg, marginBottom: spacing.sm },

  summaryCard: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  summaryCol: { flex: 1 },
  summaryLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  summaryDivider: {
    width: 1,
    height: 36,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginHorizontal: spacing.md,
  },
  trackBg: {
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },
  trackFill: {
    height: "100%",
    borderRadius: 3,
  },
  unallocatedText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
  },

  sectionTitle: {
    ...typography.subtitle,
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  rowLabel: { ...typography.body, fontWeight: "600" },
  rowAmount: { fontSize: 17, fontWeight: "700", color: colors.textPrimary },
  rowBudget: { fontSize: 14, color: colors.textMuted, marginTop: 2 },
  separator: { height: 1, backgroundColor: colors.border },

  sheetBackdrop: { flex: 1, backgroundColor: "#000000AA", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.lg },
  sheetHeader: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.lg },
  sheetTitle: { ...typography.subtitle, color: colors.textPrimary, fontSize: 20 },
  sheetActions: { flexDirection: "row", gap: spacing.md, marginTop: spacing.sm },
});
