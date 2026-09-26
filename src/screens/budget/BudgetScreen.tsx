import React, { useEffect, useState } from "react";
import {
  AccessibilityInfo,
  FlatList,
  LayoutAnimation,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  TextInput,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { onlineManager } from "@tanstack/react-query";
import { useDashboard } from "../../hooks/useDashboard";
import { useSnackbar } from "../../components/snackbar/SnackbarContext";
import { useBudgets } from "../../hooks/useBudgets";
import { useCategories } from "../../hooks/useCategories";
import { useAuth } from "../../context/AuthContext";
import { ScreenContainer } from "../../components/ScreenContainer";
import { Card } from "../../components/Card";
import { MonthPicker } from "../../components/MonthPicker";
import { AnimatedProgressBar } from "../../components/AnimatedProgressBar";
import { NeedWantAnalyticsCard } from "../../components/NeedWantAnalyticsCard";
import { CategoryPill } from "../../components/CategoryPill";
import { TextField } from "../../components/TextField";
import { Button } from "../../components/Button";
import { EmptyState } from "../../components/EmptyState";
import { BudgetSkeleton } from "../../components/Skeleton";
import { useTabBarPadding } from "../../hooks/useTabBarPadding";
import { colors } from "../../theme/colors";
import { radius, size, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { formatCurrency, formatAmountInput } from "../../utils/currency";
import { OFFLINE_MESSAGE, getErrorMessage } from "../../api/client";
import { formatMonthLabel } from "../../utils/date";
import { hapticLight } from "../../utils/haptics";
import { Category } from "../../types/models";
import { useAppData } from "../../context/AppDataContext";
import { useDialog } from "../../context/DialogContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomSheet } from "../../components/BottomSheet";
import { useRoute, useNavigation, RouteProp, NavigationProp } from "@react-navigation/native";
import { TabParamList } from "../../types/navigation";

export function BudgetScreen() {
  const route = useRoute<RouteProp<TabParamList, "Budget">>();
  const navigation = useNavigation<NavigationProp<TabParamList, "Budget">>();
  const { user, updateProfile } = useAuth();
  const { selectedMonth, setSelectedMonth } = useAppData();
  const { data: summary, error, isOffline, refetch } = useDashboard();
  const { data: categories } = useCategories();
  const { setBudget, clearBudget } = useBudgets(selectedMonth);
  const { alert } = useDialog();
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const bottomPadding = useTabBarPadding();
  const snackbar = useSnackbar();
  // Collapsed on each mount; kept across month changes while the screen stays mounted (§S5).
  const [unusedExpanded, setUnusedExpanded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((on) => {
        if (!cancelled) setReduceMotion(on);
      })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);

  // Same rule as Home: keep saved figures, say they're not fresh (S-6). Offline, TanStack pauses
  // the refetch instead of failing it, so don't wait on it.
  const handleRefresh = async () => {
    const showRefreshFailed = () =>
      snackbar.show({
        id: "S-6",
        text: "Couldn't refresh. Showing saved figures.",
        icon: "cloud-alert-outline",
        duration: 4000,
        priority: 3,
      });
    if (!onlineManager.isOnline()) {
      if (summary) showRefreshFailed();
      return;
    }
    setRefreshing(true);
    try {
      const result = await refetch();
      if (result.isError && summary) showRefreshFailed();
    } finally {
      setRefreshing(false);
    }
  };

  React.useEffect(() => {
    if (route.params?.openCategoryId && categories) {
      const cat = categories.find((c) => c.id === route.params?.openCategoryId);
      if (cat) {
        setEditingCategory(cat);
      }
      navigation.setParams({ openCategoryId: undefined });
    }
  }, [route.params?.openCategoryId, categories, navigation]);

  const rows = (categories ?? []).map((category) => {
    const budgetMatch = summary?.budgetVsActual.find((b) => b.categoryId === category.id);
    const breakdownMatch = summary?.categoryBreakdown.find((c) => c.categoryId === category.id);
    return {
      category,
      budget: budgetMatch?.budget ?? 0,
      actual: breakdownMatch?.amount ?? budgetMatch?.actual ?? 0,
      hasBudget: Boolean(budgetMatch),
    };
  }).sort((a, b) => {
    // 1. Sort by actual spent (highest first)
    if (b.actual !== a.actual) return b.actual - a.actual;
    // 2. Sort by allocated budget (highest first)
    if (b.budget !== a.budget) return b.budget - a.budget;
    // 3. Fallback to alphabetical sorting by category name
    return a.category.name.localeCompare(b.category.name);
  });

  // "Unused" = no budget and nothing spent this month. They fold into one row so the list shows
  // what matters, without hiding a category that has either (§S5, R-5).
  const usedRows = rows.filter((r) => r.hasBudget || r.actual > 0);
  const unusedRows = rows
    .filter((r) => !r.hasBudget && r.actual === 0)
    .sort((a, b) => a.category.name.localeCompare(b.category.name));
  // With nothing in the main list, the group is the list, so it opens expanded.
  const showUnused = unusedExpanded || usedRows.length === 0;
  const unusedLabel = `${unusedRows.length} unused ${unusedRows.length === 1 ? "category" : "categories"}`;

  const toggleUnused = () => {
    hapticLight();
    if (!reduceMotion) LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setUnusedExpanded((v) => !v);
  };

  const renderRow = (item: (typeof rows)[number]) => {
    const progress = item.budget > 0 ? item.actual / item.budget : 0;
    return (
      <TouchableOpacity
        key={item.category.id}
        style={styles.capsule}
        onPress={() => setEditingCategory(item.category)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${item.category.name}, ${formatCurrency(item.actual)} of ${formatCurrency(item.budget)}`}
      >
        <View style={styles.capsuleHeader}>
          <View style={styles.capsuleLeft}>
            <CategoryPill icon={item.category.icon} color={item.category.color} size={42} />
            <Text style={styles.capsuleLabel}>{item.category.name}</Text>
          </View>
          <View style={styles.capsuleRight}>
            <Text style={styles.capsuleAmount}>{formatCurrency(item.actual)}</Text>
            <Text style={styles.capsuleBudget}>
              {item.hasBudget ? `of ${formatCurrency(item.budget)}` : "no budget"}
            </Text>
          </View>
        </View>

        {item.hasBudget && item.budget > 0 && (
          <AnimatedProgressBar progress={progress} height={6} style={{ marginTop: spacing.sm }} />
        )}
      </TouchableOpacity>
    );
  };

  const totalBudgeted = rows.reduce((sum, r) => sum + r.budget, 0);
  const monthlyIncome = summary?.monthlyIncome ?? 0;
  const unallocated = monthlyIncome - totalBudgeted;

  return (
    <ScreenContainer>
      <Text style={styles.title}>Budget</Text>

      {!summary && (error || isOffline) ? (
        // A failed load used to render the list with "BUDGETED Rs 0", which is false (§5.4).
        <View style={styles.errorBlock}>
          <MaterialCommunityIcons name="cloud-alert-outline" size={48} color={colors.textSecondary} />
          <Text style={styles.errorTitle}>Couldn't load your budget</Text>
          <Text style={styles.errorSubtitle}>{error ? getErrorMessage(error) : OFFLINE_MESSAGE}</Text>
          <Button label="Try again" variant="secondary" onPress={() => refetch()} />
        </View>
      ) : !summary ? (
        <BudgetSkeleton />
      ) : (
        <FlatList
          data={usedRows}
          keyExtractor={(item) => item.category.id}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          contentContainerStyle={{ paddingBottom: bottomPadding }}
          ListHeaderComponent={
            <>
              <View style={styles.topRow}>
                <View style={{ flex: 1 }}>
                  <MonthPicker month={selectedMonth} onChange={setSelectedMonth} allowFuture />
                </View>
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
                        : `${formatCurrency(unallocated)} planned savings`}
                    </Text>
                  </>
                )}
              </View>

              {/* 50/30/20 Financial Health Analytics */}
              <NeedWantAnalyticsCard
                income={monthlyIncome}
                needsTotal={summary?.needsTotal ?? 0}
                wantsTotal={summary?.wantsTotal ?? 0}
                savingsTotal={monthlyIncome > 0 ? Math.max(0, monthlyIncome - (summary?.totalExpenses ?? 0)) : 0}
                style={{ marginTop: spacing.md }}
              />

              <Text style={styles.sectionTitle}>Categories</Text>
            </>
          }
          ListEmptyComponent={
            rows.length === 0 ? (
              <EmptyState icon="chart-donut" title="No categories yet" />
            ) : (
              <Text style={styles.emptyMonthText}>
                No budgets or spending in {formatMonthLabel(selectedMonth)}
              </Text>
            )
          }
          ListFooterComponent={
            unusedRows.length > 0 ? (
              <>
                {usedRows.length > 0 && (
                  <TouchableOpacity
                    style={[styles.capsule, styles.groupRow]}
                    onPress={toggleUnused}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: showUnused }}
                    accessibilityLabel={unusedLabel}
                  >
                    <Text style={styles.groupLabel}>
                      {showUnused ? `Hide ${unusedLabel}` : unusedLabel}
                    </Text>
                    <MaterialCommunityIcons
                      name={showUnused ? "chevron-up" : "chevron-down"}
                      size={20}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                )}
                {showUnused && unusedRows.map(renderRow)}
              </>
            ) : null
          }
          renderItem={({ item }) => renderRow(item)}
        />
      )}

      <BottomSheet visible={!!editingCategory} onClose={() => setEditingCategory(null)}>
        <BudgetEditSheet
          // Keyed so each category gets a fresh instance. Without this the amount field kept
          // the previously opened category's value and saving mis-budgeted the new one.
          key={editingCategory?.id ?? "none"}
          category={editingCategory}
          currentAmount={rows.find((r) => r.category.id === editingCategory?.id)?.budget ?? 0}
          onClose={() => setEditingCategory(null)}
          onSave={async (amount) => {
            if (!editingCategory) return;
            try {
              // Zero means "no budget", not "a budget of nothing" — otherwise the row keeps
              // claiming to be budgeted and the progress bar renders against zero.
              if (amount > 0) {
                await setBudget(editingCategory.id, amount);
              } else {
                await clearBudget(editingCategory.id);
              }
              setEditingCategory(null);
            } catch (error) {
              alert({ title: "Couldn't save budget", message: getErrorMessage(error) });
            }
          }}
        />
      </BottomSheet>


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
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [value, setValue] = useState(currentAmount ? formatAmountInput(String(currentAmount)) : "");

  if (!category) return null;

  return (
    <View style={styles.sheetInner}>
      <View style={styles.sheetHeader}>
        <CategoryPill icon={category.icon} color={category.color} size={38} />
        <Text style={styles.sheetTitle}>{category.name}</Text>
      </View>
      <TextField
        label={`Monthly budget (${user?.currency || "PKR"})`}
        keyboardType="decimal-pad"
        value={value}
        onChangeText={(val) => setValue(formatAmountInput(val))}
        autoFocus
        placeholder="0"
      />
      <View style={styles.sheetActions}>
        <Button label="Cancel" variant="secondary" onPress={onClose} style={{ flex: 1 }} />
        <Button label="Save" onPress={() => onSave(Number(value.replace(/,/g, "")) || 0)} style={{ flex: 1 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    ...typography.title,
    paddingTop: spacing.lg + 4,
    marginBottom: spacing.md,
    fontSize: 24,
    letterSpacing: -0.3,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  savingsGoalBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.accentMuted,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.3)",
  },
  savingsGoalBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.accent,
  },
  rolloverCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.successMuted,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
    marginBottom: spacing.lg,
  },
  rolloverIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  rolloverTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  rolloverSub: {
    fontSize: 12,
    color: colors.success,
    fontWeight: "500",
    marginTop: 2,
  },
  rolloverAmount: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.success,
  },

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

  groupRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: size.minTouch,
  },
  groupLabel: { ...typography.body, fontWeight: "600", color: colors.textSecondary, flexShrink: 1 },
  emptyMonthText: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.md },
  errorBlock: { alignItems: "center", gap: spacing.sm, paddingTop: spacing.xl },
  errorTitle: { ...typography.body, fontWeight: "600", color: colors.textSecondary, textAlign: "center" },
  errorSubtitle: { ...typography.caption, textAlign: "center", marginBottom: spacing.sm },
  sectionTitle: {
    ...typography.subtitle,
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },

  capsule: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  capsuleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  capsuleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm + 2,
  },
  capsuleLabel: {
    ...typography.body,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  capsuleRight: {
    alignItems: "flex-end",
  },
  capsuleAmount: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  capsuleBudget: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textMuted,
    marginTop: 2,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 3,
    overflow: "hidden",
    marginTop: spacing.md,
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 3,
  },

  // Sheet
  sheetInner: {
    paddingBottom: spacing.md,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  sheetTitle: { ...typography.subtitle, color: colors.textPrimary, fontSize: 20 },
  sheetLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  sheetActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },

  // Savings Goal Modal Styles
  modalContent: {
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  modalTitle: { ...typography.subtitle, fontSize: 18, fontWeight: "700", color: colors.textPrimary },
  modalSubtitle: { ...typography.caption, color: colors.textSecondary, lineHeight: 18 },
  presetRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs + 2,
    marginTop: spacing.xs,
  },
  presetPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  presetPillActive: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.accent,
  },
  presetText: {
    ...typography.caption,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  presetTextActive: {
    color: colors.accent,
    fontWeight: "700",
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 52,
    marginTop: spacing.xs,
  },
  inputPrefix: {
    ...typography.body,
    fontWeight: "600",
    color: colors.textSecondary,
    marginRight: spacing.sm,
  },
  numericInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "700",
  },
  modalActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
});
