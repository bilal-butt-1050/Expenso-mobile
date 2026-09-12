import React, { useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useExpenses } from "../../hooks/useExpenses";
import { useAppData } from "../../context/AppDataContext";
import { useDialog } from "../../context/DialogContext";
import { ScreenContainer } from "../../components/ScreenContainer";
import { MonthPicker } from "../../components/MonthPicker";
import { EmptyState } from "../../components/EmptyState";
import { CategoryPill, StatusBadge } from "../../components/CategoryPill";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { formatCurrency } from "../../utils/currency";
import { formatDate } from "../../utils/date";
import { Expense, ExpenseStatus } from "../../types/models";
import { RootStackParamList } from "../../types/navigation";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Filter = ExpenseStatus | "All";

export function ExpensesListScreen() {
  const navigation = useNavigation<Nav>();
  const { selectedMonth, setSelectedMonth } = useAppData();
  const { confirm, showToast } = useDialog();
  const [filter, setFilter] = useState<Filter>("All");
  const { data, isLoading, removeExpense, toggleStatus } = useExpenses(
    filter === "All" ? {} : { status: filter }
  );

  const confirmDelete = (expense: Expense) => {
    confirm({
      title: "Delete expense?",
      message: `${expense.category.name} · ${formatCurrency(expense.amount)}`,
      confirmText: "Delete",
      destructive: true,
      icon: "trash-can-outline",
      onConfirm: async () => {
        await removeExpense(expense.id);
        showToast({ message: "Deleted", type: "success" });
      },
    });
  };

  const handleToggleStatus = async (expense: Expense) => {
    await toggleStatus(expense.id);
    showToast({
      message: expense.status === "Paid" ? "Marked Unpaid" : "Marked Paid",
      type: "info",
    });
  };

  return (
    <ScreenContainer style={styles.noPad}>
      <View style={styles.top}>
        <Text style={styles.title}>Expenses</Text>
        <MonthPicker month={selectedMonth} onChange={setSelectedMonth} />
        <View style={styles.filterRow}>
          {(["All", "Unpaid", "Paid"] as Filter[]).map((f) => (
            <TouchableOpacity
              key={f}
              onPress={() => setFilter(f)}
              style={[styles.filterChip, filter === f && styles.filterChipActive]}
              accessibilityRole="button"
              accessibilityLabel={`Filter: ${f}`}
            >
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={data ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshing={isLoading}
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState icon="receipt-text-outline" title="No expenses yet" />
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => navigation.navigate("ExpenseForm", { expense: item })}
            onLongPress={() => confirmDelete(item)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`${item.category.name}, ${formatCurrency(item.amount)}, ${item.status}`}
          >
            <CategoryPill icon={item.category.icon} size={42} />
            <View style={styles.rowMiddle}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {item.description || item.category.name}
              </Text>
              <Text style={styles.rowSub}>{formatDate(item.date)}</Text>
            </View>
            <View style={styles.rowEnd}>
              <Text style={styles.rowAmount}>{formatCurrency(item.amount)}</Text>
              <TouchableOpacity onPress={() => handleToggleStatus(item)} hitSlop={10}>
                <StatusBadge status={item.status} />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("ExpenseForm", undefined)}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Add Expense"
      >
        <MaterialCommunityIcons name="plus" size={28} color={colors.accentForeground} />
      </TouchableOpacity>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  noPad: { paddingHorizontal: 0 },
  top: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: { ...typography.title },
  filterRow: { flexDirection: "row", gap: spacing.sm, justifyContent: "center" },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderColor: colors.borderLight,
  },
  filterText: { color: colors.textSecondary, fontSize: 14, fontWeight: "600" },
  filterTextActive: { color: colors.textPrimary, fontWeight: "700" },

  list: { paddingHorizontal: spacing.lg, paddingBottom: 100, flexGrow: 1 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowMiddle: { flex: 1 },
  rowTitle: { ...typography.body, fontWeight: "600" },
  rowSub: { ...typography.caption, color: colors.textMuted, marginTop: 2, fontSize: 14 },
  rowEnd: { alignItems: "flex-end", gap: spacing.xs },
  rowAmount: { fontSize: 17, fontWeight: "700", color: colors.textPrimary },

  fab: {
    position: "absolute",
    right: spacing.lg,
    bottom: spacing.xl,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
});
