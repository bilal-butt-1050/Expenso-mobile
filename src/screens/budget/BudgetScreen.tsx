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
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { formatCurrency } from "../../utils/currency";
import { formatMonthLabel } from "../../utils/date";
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
      unpaid: match?.unpaid ?? 0,
      hasBudget: Boolean(match),
    };
  });

  const totalBudgeted = rows.reduce((sum, r) => sum + r.budget, 0);
  const monthlyIncome = summary?.monthlyIncome ?? 0;
  const unallocated = monthlyIncome - totalBudgeted;
  const monthElapsed = summary?.monthProgressPercentage ?? 50;

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.title}>Budget</Text>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(item) => item.category.id}
        refreshing={isLoading}
        contentContainerStyle={{ paddingBottom: spacing.xxl + 32 }}
        ListHeaderComponent={
          <>
            {/* Month Picker Capsule */}
            <View style={{ marginBottom: spacing.md }}>
              <MonthPicker month={selectedMonth} onChange={setSelectedMonth} />
            </View>

            {/* Budget Allocation Header Card */}
            <Card style={styles.allocationCard}>
              <View style={styles.allocationMetricsRow}>
                <View style={styles.allocationMetricCol}>
                  <Text style={styles.metricLabel}>TOTAL BUDGETED</Text>
                  <Text style={styles.metricValue}>{formatCurrency(totalBudgeted)}</Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.allocationMetricCol}>
                  <Text style={styles.metricLabel}>MONTHLY INCOME</Text>
                  <Text style={[styles.metricValue, { color: colors.accent }]}>
                    {formatCurrency(monthlyIncome)}
                  </Text>
                </View>
              </View>

              {/* Live Allocation Mini Progress Bar */}
              {monthlyIncome > 0 && (
                <View style={styles.allocationTrackBg}>
                  <View
                    style={[
                      styles.allocationTrackFill,
                      {
                        width: `${Math.min(100, (totalBudgeted / monthlyIncome) * 100)}%`,
                        backgroundColor: unallocated < 0 ? colors.danger : colors.accent,
                      },
                    ]}
                  />
                </View>
              )}

              {/* Status Pill & Allocation Insight Row */}
              {monthlyIncome > 0 && (
                <View style={styles.allocationBottomRow}>
                  <Text style={styles.allocationProgressText}>
                    {((totalBudgeted / Math.max(1, monthlyIncome)) * 100).toFixed(0)}% of income budgeted
                  </Text>
                  <View
                    style={[
                      styles.statusPill,
                      unallocated < 0
                        ? styles.statusPillOver
                        : unallocated === 0
                        ? styles.statusPillExact
                        : styles.statusPillUnder,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        unallocated < 0
                          ? styles.statusTextOver
                          : unallocated === 0
                          ? styles.statusTextExact
                          : styles.statusTextUnder,
                      ]}
                    >
                      {unallocated < 0
                        ? `Over by ${formatCurrency(Math.abs(unallocated))}`
                        : unallocated === 0
                        ? `100% Allocated ✓`
                        : `${formatCurrency(unallocated)} unallocated`}
                    </Text>
                  </View>
                </View>
              )}
            </Card>

            <View style={styles.listSectionHeader}>
              <Text style={styles.listSectionTitle}>Category Allocations</Text>
              <Text style={styles.listSectionSubtitle}>Tap row to edit budget</Text>
            </View>
          </>
        }
        ListEmptyComponent={
          <EmptyState icon="chart-donut" title="No categories yet" subtitle="Add categories in Settings first." />
        }
        renderItem={({ item }) => {
          const progress = item.budget > 0 ? item.actual / item.budget : 0;
          const progressPct = progress * 100;
          const isOver = item.actual > item.budget;
          const isPacingFast = !isOver && progressPct > monthElapsed + 15;

          return (
            <Card style={styles.row}>
              <TouchableOpacity style={styles.rowTop} onPress={() => setEditingCategory(item.category)}>
                <CategoryPill icon={item.category.icon} color={item.category.color} size={32} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowLabel}>{item.category.name}</Text>
                  {item.hasBudget && item.budget > 0 && (
                    <View style={styles.pacingRow}>
                      <View
                        style={[
                          styles.pacingTag,
                          isOver
                            ? styles.pacingTagOver
                            : isPacingFast
                            ? styles.pacingTagFast
                            : styles.pacingTagTrack,
                        ]}
                      >
                        <Text
                          style={[
                            styles.pacingTagText,
                            isOver
                              ? styles.pacingTextOver
                              : isPacingFast
                              ? styles.pacingTextFast
                              : styles.pacingTextTrack,
                          ]}
                        >
                          {isOver ? "Over Budget" : isPacingFast ? "Pacing Fast" : "On Track"}
                        </Text>
                      </View>
                      <Text style={styles.pacingPctText}>{progressPct.toFixed(0)}% spent</Text>
                    </View>
                  )}
                </View>

                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.rowAmounts}>
                    {formatCurrency(item.actual)}
                  </Text>
                  <Text style={styles.rowBudget}>
                    {item.hasBudget ? `of ${formatCurrency(item.budget)}` : "no budget"}
                  </Text>
                </View>
              </TouchableOpacity>

              {item.hasBudget && (
                <View style={{ marginTop: spacing.sm }}>
                  <ProgressBar progress={progress} color={isOver ? colors.danger : item.category.color} />
                  {item.unpaid > 0 && (
                    <Text style={styles.unpaidNote}>{formatCurrency(item.unpaid)} unpaid</Text>
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
  header: {
    paddingTop: spacing.lg + 4,
    marginBottom: spacing.xs,
  },
  title: { ...typography.title, fontSize: 24, letterSpacing: -0.3 },

  // Allocation Card Styles
  allocationCard: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md + 4,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  allocationBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 2,
  },
  allocationProgressText: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  statusPill: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  statusPillUnder: {
    backgroundColor: "rgba(0, 230, 118, 0.08)",
    borderColor: "rgba(0, 230, 118, 0.25)",
  },
  statusPillExact: {
    backgroundColor: "rgba(0, 230, 118, 0.15)",
    borderColor: colors.accent,
  },
  statusPillOver: {
    backgroundColor: "rgba(255, 82, 82, 0.12)",
    borderColor: "rgba(255, 82, 82, 0.3)",
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "700",
  },
  statusTextUnder: { color: colors.accent },
  statusTextExact: { color: colors.accent },
  statusTextOver: { color: colors.danger },

  allocationMetricsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 2,
  },
  allocationMetricCol: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  metricDivider: {
    width: 1,
    height: 32,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    marginHorizontal: spacing.md,
  },
  allocationTrackBg: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    overflow: "hidden",
  },
  allocationTrackFill: {
    height: "100%",
    borderRadius: 2,
  },

  listSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
    marginTop: spacing.xs,
  },
  listSectionTitle: {
    ...typography.subtitle,
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  listSectionSubtitle: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textMuted,
  },

  // Row Styles
  row: { marginBottom: spacing.sm, padding: spacing.md, borderRadius: 16 },
  rowTop: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  rowLabel: { ...typography.body, fontWeight: "600" },
  pacingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 3,
  },
  pacingTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pacingTagTrack: {
    backgroundColor: "rgba(0, 230, 118, 0.1)",
  },
  pacingTagFast: {
    backgroundColor: "rgba(255, 179, 0, 0.12)",
  },
  pacingTagOver: {
    backgroundColor: "rgba(255, 82, 82, 0.12)",
  },
  pacingTagText: {
    fontSize: 10,
    fontWeight: "700",
  },
  pacingTextTrack: { color: colors.accent },
  pacingTextFast: { color: colors.warning },
  pacingTextOver: { color: colors.danger },
  pacingPctText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: "500",
  },
  rowAmounts: { ...typography.body, fontWeight: "700" },
  rowBudget: { ...typography.small, color: colors.textMuted, marginTop: 1 },
  unpaidNote: { ...typography.small, color: colors.warning, marginTop: spacing.xs },

  sheetBackdrop: { flex: 1, backgroundColor: "#000000AA", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing.lg },
  sheetHeader: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.lg },
  sheetTitle: { ...typography.subtitle, color: colors.textPrimary },
  sheetActions: { flexDirection: "row", gap: spacing.md, marginTop: spacing.sm },
});
