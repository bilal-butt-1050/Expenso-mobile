import React, { useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useIncome } from "../../hooks/useIncome";
import { useAppData } from "../../context/AppDataContext";
import { useDialog } from "../../context/DialogContext";
import { ScreenContainer } from "../../components/ScreenContainer";
import { MonthPicker } from "../../components/MonthPicker";
import { EmptyState } from "../../components/EmptyState";
import { ListScreenSkeleton } from "../../components/Skeleton";
import { CategoryPill } from "../../components/CategoryPill";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { formatCurrency } from "../../utils/currency";
import { formatDate } from "../../utils/date";
import { Income, IncomeStatus } from "../../types/models";
import { RootStackParamList } from "../../types/navigation";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Filter = IncomeStatus | "All";

export function IncomeListScreen() {
  const navigation = useNavigation<Nav>();
  const { selectedMonth, setSelectedMonth } = useAppData();
  const { confirm, showToast } = useDialog();
  const [filter, setFilter] = useState<Filter>("All");

  const { data: allIncomes, isLoading, removeIncome, toggleStatus } = useIncome(
    filter === "All" ? {} : { status: filter }
  );

  const { data: monthIncomes } = useIncome();
  const items = monthIncomes ?? [];
  const totalIncome = items.reduce((sum, i) => sum + i.amount, 0);

  const confirmDelete = (income: Income) => {
    confirm({
      title: "Delete income?",
      message: `${income.source} · ${formatCurrency(income.amount)}`,
      confirmText: "Delete",
      destructive: true,
      icon: "trash-can-outline",
      onConfirm: async () => {
        await removeIncome(income.id);
        showToast({ message: "Deleted", type: "success" });
      },
    });
  };

  const handleToggleStatus = async (income: Income) => {
    await toggleStatus(income.id);
    showToast({
      message: income.status === "Received" ? "Marked Expected" : "Marked Received",
      type: "info",
    });
  };

  return (
    <ScreenContainer style={styles.noPad}>
      <View style={styles.top}>
        <Text style={styles.title}>Income</Text>
        <MonthPicker month={selectedMonth} onChange={setSelectedMonth} />

        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroLabel}>TOTAL</Text>
          <Text style={styles.heroAmount} numberOfLines={1} adjustsFontSizeToFit>
            {formatCurrency(totalIncome)}
          </Text>
        </View>

        {/* Filters */}
        <View style={styles.filterRow}>
          {(["All", "Received", "Expected"] as Filter[]).map((f) => (
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
        data={allIncomes ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshing={isLoading}
        ListEmptyComponent={
          isLoading ? (
            <ListScreenSkeleton />
          ) : (
            <EmptyState icon="wallet-plus-outline" title="No income this month" />
          )
        }
        renderItem={({ item }) => {
          const isReceived = item.status === "Received";
          return (
            <TouchableOpacity
              style={styles.row}
              onPress={() => navigation.navigate("IncomeForm", { income: item })}
              onLongPress={() => confirmDelete(item)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`${item.source}, ${formatCurrency(item.amount)}, ${item.status}`}
            >
              <CategoryPill icon={item.sourceIcon || "cash-multiple"} size={42} />
              <View style={styles.rowMiddle}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {item.description || item.source}
                </Text>
                <Text style={styles.rowSub}>{formatDate(item.date)}</Text>
              </View>
              <View style={styles.rowEnd}>
                <Text style={styles.rowAmount}>+{formatCurrency(item.amount)}</Text>
                <TouchableOpacity
                  onPress={() => handleToggleStatus(item)}
                  hitSlop={10}
                  style={[styles.statusPill, isReceived ? styles.statusReceived : styles.statusExpected]}
                >
                  <Text style={[styles.statusText, { color: isReceived ? colors.textPrimary : colors.warning }]}>
                    {item.status}
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("IncomeForm", undefined)}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Add Income"
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

  hero: {
    alignItems: "center",
    paddingVertical: spacing.sm,
    gap: 4,
  },
  heroLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textMuted,
    letterSpacing: 1,
  },
  heroAmount: {
    fontSize: 36,
    fontWeight: "800",
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },

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
  rowAmount: { fontSize: 17, fontWeight: "800", color: colors.textPrimary },

  statusPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  statusReceived: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.14)",
  },
  statusExpected: {
    backgroundColor: colors.warningMuted,
    borderColor: "rgba(245,158,11,0.25)",
  },
  statusText: { fontSize: 12, fontWeight: "700" },

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
