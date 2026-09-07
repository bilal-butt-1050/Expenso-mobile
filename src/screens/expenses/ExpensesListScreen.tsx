import React, { useState } from "react";
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useExpenses } from "../../hooks/useExpenses";
import { useAppData } from "../../context/AppDataContext";
import { ScreenContainer } from "../../components/ScreenContainer";
import { MonthPicker } from "../../components/MonthPicker";
import { EmptyState } from "../../components/EmptyState";
import { CategoryPill, StatusBadge } from "../../components/CategoryPill";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
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
  const [filter, setFilter] = useState<Filter>("All");
  const { data, isLoading, removeExpense, toggleStatus } = useExpenses(
    filter === "All" ? {} : { status: filter }
  );

  const confirmDelete = (expense: Expense) => {
    Alert.alert("Delete expense?", `${expense.description || expense.category.name} · ${formatCurrency(expense.amount)}`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => removeExpense(expense.id) },
    ]);
  };

  return (
    <ScreenContainer style={styles.noPad}>
      <View style={styles.top}>
        <View style={styles.header}>
          <Text style={styles.title}>Expenses</Text>
        </View>
        <MonthPicker month={selectedMonth} onChange={setSelectedMonth} />
        <View style={styles.filterRow}>
          {(["All", "Unpaid", "Paid"] as Filter[]).map((f) => (
            <TouchableOpacity
              key={f}
              onPress={() => setFilter(f)}
              style={[styles.filterChip, filter === f && styles.filterChipActive]}
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
            <EmptyState
              icon="receipt-text-outline"
              title="No expenses yet"
              subtitle="Tap the + button to log your first one — it takes about 10 seconds."
            />
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => navigation.navigate("ExpenseForm", { expense: item })}
            onLongPress={() => confirmDelete(item)}
          >
            <CategoryPill icon={item.category.icon} color={item.category.color} />
            <View style={styles.rowMiddle}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {item.description || item.category.name}
              </Text>
              <Text style={styles.rowSubtitle}>
                {item.category.name} · {formatDate(item.date)}
              </Text>
            </View>
            <View style={styles.rowEnd}>
              <Text style={styles.amount}>{formatCurrency(item.amount)}</Text>
              <TouchableOpacity onPress={() => toggleStatus(item.id)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
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
      >
        <MaterialCommunityIcons name="plus" size={28} color={colors.background} />
      </TouchableOpacity>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  noPad: { paddingHorizontal: 0 },
  top: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg + 4,
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
  header: {
    marginBottom: spacing.xs,
  },
  title: { ...typography.title, fontSize: 24, letterSpacing: -0.3 },
  filterRow: { flexDirection: "row", gap: spacing.sm, justifyContent: "center" },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    backgroundColor: colors.surfaceRaised,
  },
  filterChipActive: { backgroundColor: colors.accentMuted },
  filterText: { color: colors.textSecondary, fontSize: 12, fontWeight: "600" },
  filterTextActive: { color: colors.accent },
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
  rowSubtitle: { ...typography.small, marginTop: 2 },
  rowEnd: { alignItems: "flex-end", gap: spacing.xs },
  amount: { ...typography.body, fontWeight: "700" },
  fab: {
    position: "absolute",
    right: spacing.lg,
    bottom: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.accent,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
});
