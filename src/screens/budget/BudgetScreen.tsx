import React, { useState } from "react";
import {
  FlatList,
  LayoutAnimation,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { onlineManager } from "@tanstack/react-query";
import { useDashboard } from "../../hooks/useDashboard";
import { useSnackbar } from "../../components/snackbar/SnackbarContext";
import { useBudgets } from "../../hooks/useBudgets";
import { useCategories } from "../../hooks/useCategories";
import { useAuth } from "../../context/AuthContext";
import { ScreenContainer } from "../../components/ScreenContainer";
import { MonthPicker } from "../../components/MonthPicker";
import { AnimatedProgressBar } from "../../components/AnimatedProgressBar";
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
import { useReduceMotion } from "../../hooks/useReduceMotion";
import { Category } from "../../types/models";
import { useAppData } from "../../context/AppDataContext";
import { useDialog } from "../../context/DialogContext";
import { BottomSheet } from "../../components/BottomSheet";
import { useRoute, useNavigation, RouteProp, NavigationProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList, TabParamList } from "../../types/navigation";

/** Category limits, as the old Categories screen enforced them. */
const MIN_CATEGORIES = 5;
const MAX_CATEGORIES = 20;
/** Where a deleted category's expenses go, so it can't itself be changed. */
const FALLBACK_CATEGORY = "Other";

export function BudgetScreen() {
  const route = useRoute<RouteProp<TabParamList, "Budget">>();
  const navigation = useNavigation<NavigationProp<TabParamList, "Budget">>();
  const rootNavigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { selectedMonth, setSelectedMonth } = useAppData();
  const { data: summary, error, isOffline, refetch } = useDashboard();
  const { data: categories, removeCategory } = useCategories();
  const { setBudget, clearBudget } = useBudgets(selectedMonth);
  const { alert, confirm } = useDialog();
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  // Long-pressed category: its Edit / Delete sheet (R-33).
  const [managingCategory, setManagingCategory] = useState<Category | null>(null);
  const bottomPadding = useTabBarPadding();
  const snackbar = useSnackbar();
  // Collapsed on each mount; kept across month changes while the screen stays mounted (§S5).
  const [unusedExpanded, setUnusedExpanded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const reduceMotion = useReduceMotion();

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

  const categoryCount = categories?.length ?? 0;

  const addCategory = () => {
    hapticLight();
    if (categoryCount >= MAX_CATEGORIES) {
      alert({
        title: "Category limit reached",
        message: `You can have up to ${MAX_CATEGORIES} categories, to keep your budget manageable.`,
        icon: "alert-circle-outline",
      });
      return;
    }
    rootNavigation.navigate("CategoryForm", undefined);
  };

  const manageCategory = (category: Category) => {
    hapticLight();
    if (category.name === FALLBACK_CATEGORY) {
      alert({
        title: `"${FALLBACK_CATEGORY}" can't be changed`,
        message: "Expenses from deleted categories move here, so it always stays.",
        icon: "information-outline",
      });
      return;
    }
    setManagingCategory(category);
  };

  const deleteCategory = (category: Category) => {
    setManagingCategory(null);
    if (categoryCount <= MIN_CATEGORIES) {
      alert({
        title: "Minimum categories reached",
        message: `You need at least ${MIN_CATEGORIES} categories. Add a new one before deleting this one.`,
        icon: "alert-circle-outline",
      });
      return;
    }
    confirm({
      title: `Delete "${category.name}"?`,
      message: `Any expenses in this category will move to "${FALLBACK_CATEGORY}", so nothing gets lost.`,
      confirmText: "Delete",
      destructive: true,
      icon: "trash-can-outline",
      onConfirm: async () => {
        try {
          if (!reduceMotion) LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          await removeCategory(category.id);
        } catch (err) {
          alert({ title: "Couldn't delete category", message: getErrorMessage(err), icon: "alert-circle-outline" });
        }
      },
    });
  };

  const renderRow = (item: (typeof rows)[number]) => {
    const progress = item.budget > 0 ? item.actual / item.budget : 0;
    const isOver = item.hasBudget && item.budget > 0 && item.actual > item.budget;
    return (
      <TouchableOpacity
        key={item.category.id}
        style={styles.capsule}
        onPress={() => setEditingCategory(item.category)}
        onLongPress={() => manageCategory(item.category)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={
          isOver
            ? `${item.category.name}, ${formatCurrency(item.actual)} spent, ${formatCurrency(item.actual - item.budget)} over a ${formatCurrency(item.budget)} budget`
            : `${item.category.name}, ${formatCurrency(item.actual)} of ${formatCurrency(item.budget)}`
        }
      >
        <View style={styles.capsuleHeader}>
          <View style={styles.capsuleLeft}>
            <CategoryPill icon={item.category.icon} color={item.category.color} size={42} />
            <Text style={styles.capsuleLabel}>{item.category.name}</Text>
          </View>
          <View style={styles.capsuleRight}>
            <Text style={styles.capsuleAmount}>{formatCurrency(item.actual)}</Text>
            <Text style={[styles.capsuleBudget, isOver && { color: colors.danger }]}>
              {!item.hasBudget
                ? "no budget"
                : isOver
                  ? `${formatCurrency(item.actual - item.budget)} over`
                  : `of ${formatCurrency(item.budget)}`}
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
  // What's left to hand out to categories this month (R-31). No "savings" concept for now.
  const leftToBudget = monthlyIncome - totalBudgeted;
  const monthLabel = formatMonthLabel(selectedMonth);

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
                    <Text style={styles.summaryLabel}>LEFT TO BUDGET</Text>
                    <Text style={[styles.summaryValue, leftToBudget < 0 && { color: colors.danger }]}>
                      {monthlyIncome > 0 ? formatCurrency(leftToBudget) : "—"}
                    </Text>
                  </View>
                </View>

                {monthlyIncome > 0 ? (
                  <>
                    <AnimatedProgressBar
                      progress={totalBudgeted / monthlyIncome}
                      height={6}
                      style={{ marginTop: spacing.md }}
                    />
                    <Text style={styles.unallocatedText}>
                      {leftToBudget < 0
                        ? `Budgeted ${formatCurrency(Math.abs(leftToBudget))} more than your income`
                        : `of ${formatCurrency(monthlyIncome)} income in ${monthLabel}`}
                    </Text>
                  </>
                ) : (
                  <Text style={styles.unallocatedText}>
                    Log income for {monthLabel} to see what's left to budget
                  </Text>
                )}
              </View>

              <Text style={styles.sectionTitle}>Categories</Text>
              <Text style={styles.sectionHint}>Tap to set a budget · long-press to edit</Text>
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
            <>
            {unusedRows.length > 0 ? (
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
            ) : null}
            <TouchableOpacity
              style={[styles.capsule, styles.groupRow]}
              onPress={addCategory}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Add category"
            >
              <Text style={[styles.groupLabel, { color: colors.accent }]}>+ Add category</Text>
            </TouchableOpacity>
            </>
          }
          renderItem={({ item }) => renderRow(item)}
        />
      )}

      <BottomSheet visible={!!managingCategory} onClose={() => setManagingCategory(null)}>
        {managingCategory ? (
          <View style={styles.manageSheet}>
            <View style={styles.sheetHeader}>
              <CategoryPill icon={managingCategory.icon} color={managingCategory.color} size={38} />
              <Text style={styles.sheetTitle}>{managingCategory.name}</Text>
            </View>
            <Button
              label="Edit category"
              variant="secondary"
              onPress={() => {
                const category = managingCategory;
                setManagingCategory(null);
                rootNavigation.navigate("CategoryForm", { category });
              }}
            />
            <Button label="Delete category" variant="danger" onPress={() => deleteCategory(managingCategory)} />
          </View>
        ) : null}
      </BottomSheet>

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
  sectionHint: { ...typography.small, color: colors.textSecondary, marginBottom: spacing.sm },
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

  // Sheet
  manageSheet: { gap: spacing.md, paddingBottom: spacing.md },
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
  sheetActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },

});
