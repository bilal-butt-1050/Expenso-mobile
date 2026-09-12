import React, { useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useIncome } from "../../hooks/useIncome";
import { useAppData } from "../../context/AppDataContext";
import { useDialog } from "../../context/DialogContext";
import { ScreenContainer } from "../../components/ScreenContainer";
import { Card } from "../../components/Card";
import { MonthPicker } from "../../components/MonthPicker";
import { EmptyState } from "../../components/EmptyState";
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

  // Filter-independent totals for the executive hero card
  const { data: monthIncomes } = useIncome();
  const items = monthIncomes ?? [];
  const receivedTotal = items
    .filter((i) => i.status === "Received")
    .reduce((sum, i) => sum + i.amount, 0);
  const expectedTotal = items
    .filter((i) => i.status === "Expected")
    .reduce((sum, i) => sum + i.amount, 0);
  const totalIncome = receivedTotal + expectedTotal;
  const collectedPct = totalIncome > 0 ? Math.round((receivedTotal / totalIncome) * 100) : 0;

  const confirmDelete = (income: Income) => {
    confirm({
      title: "Delete income entry?",
      message: `${income.description || income.source} · ${formatCurrency(income.amount)}`,
      confirmText: "Delete",
      destructive: true,
      icon: "trash-can-outline",
      onConfirm: async () => {
        await removeIncome(income.id);
        showToast({ message: "Income deleted", type: "success" });
      },
    });
  };

  const handleToggleStatus = async (income: Income) => {
    await toggleStatus(income.id);
    showToast({
      message:
        income.status === "Received"
          ? "Marked as Expected / Pending"
          : "Marked as Received in Hand ✓",
      type: "info",
    });
  };

  return (
    <ScreenContainer style={styles.noPad}>
      <View style={styles.top}>
        <View style={styles.header}>
          <Text style={styles.title}>Income</Text>
        </View>

        <MonthPicker month={selectedMonth} onChange={setSelectedMonth} />

        {/* Executive Cashflow Hero Card */}
        <Card style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.heroBadge}>
              <View style={styles.heroDot} />
              <Text style={styles.heroBadgeText}>TOTAL MONTHLY INCOME</Text>
            </View>
            <Text style={styles.heroPctText}>{collectedPct}% collected</Text>
          </View>

          <Text style={styles.heroAmount} numberOfLines={1} adjustsFontSizeToFit>
            {formatCurrency(totalIncome)}
          </Text>

          {/* Mini progress bar */}
          <View style={styles.heroTrackBg}>
            <View
              style={[
                styles.heroTrackFill,
                { width: `${Math.min(100, Math.max(0, collectedPct))}%` },
              ]}
            />
          </View>

          {/* Dual Badges: Received in Hand vs Expected */}
          <View style={styles.heroPillsRow}>
            <View style={[styles.heroPill, styles.heroPillReceived]}>
              <View style={styles.pillIndicatorRow}>
                <MaterialCommunityIcons name="check-circle" size={13} color={colors.textPrimary} />
                <Text style={styles.pillLabel}>RECEIVED IN HAND</Text>
              </View>
              <Text style={[styles.pillValue, { color: colors.textPrimary }]} numberOfLines={1}>
                {formatCurrency(receivedTotal)}
              </Text>
            </View>

            <View style={[styles.heroPill, styles.heroPillExpected]}>
              <View style={styles.pillIndicatorRow}>
                <MaterialCommunityIcons name="clock-outline" size={13} color={colors.textSecondary} />
                <Text style={styles.pillLabel}>EXPECTED / PENDING</Text>
              </View>
              <Text style={[styles.pillValue, { color: colors.textSecondary }]} numberOfLines={1}>
                {formatCurrency(expectedTotal)}
              </Text>
            </View>
          </View>
        </Card>

        {/* Filter Segment Chips */}
        <View style={styles.filterRow}>
          {(["All", "Received", "Expected"] as Filter[]).map((f) => (
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
        data={allIncomes ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshing={isLoading}
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              icon="wallet-plus-outline"
              title="No income logged for this month"
              subtitle="Tap the + button to log salary, freelance earnings, or expected client retainers."
            />
          ) : null
        }
        renderItem={({ item }) => {
          const isReceived = item.status === "Received";
          return (
            <TouchableOpacity
              style={styles.row}
              onPress={() => navigation.navigate("IncomeForm", { income: item })}
              onLongPress={() => confirmDelete(item)}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={`Income: ${item.description || item.source}, Amount: ${formatCurrency(item.amount)}, Status: ${item.status}`}
            >
              <CategoryPill
                icon={item.sourceIcon || "cash-multiple"}
                size={38}
              />

              <View style={styles.rowMiddle}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {item.description || item.source}
                </Text>
                <Text style={styles.rowSubtitle}>
                  {item.source} · {formatDate(item.date)}
                  {item.paymentMethod ? ` · ${item.paymentMethod}` : ""}
                </Text>
              </View>

              <View style={styles.rowEnd}>
                <Text style={styles.amount}>+{formatCurrency(item.amount)}</Text>
                <TouchableOpacity
                  onPress={() => handleToggleStatus(item)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={[
                    styles.statusPill,
                    isReceived ? styles.statusPillReceived : styles.statusPillExpected,
                  ]}
                >
                  <MaterialCommunityIcons
                    name={isReceived ? "check" : "clock-outline"}
                    size={11}
                    color={isReceived ? colors.textPrimary : colors.warning}
                  />
                  <Text
                    style={[
                      styles.statusPillText,
                      { color: isReceived ? colors.textPrimary : colors.warning },
                    ]}
                  >
                    {item.status}
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("IncomeForm", undefined)}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Add New Income"
      >
        <MaterialCommunityIcons name="plus" size={26} color={colors.accentForeground} />
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

  // Executive Cashflow Hero Card
  heroCard: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md + 4,
    gap: spacing.xs + 2,
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  heroDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.textPrimary,
  },
  heroBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.textSecondary,
    letterSpacing: 0.6,
  },
  heroPctText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  heroAmount: {
    fontSize: 32,
    fontWeight: "800",
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  heroTrackBg: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    overflow: "hidden",
    marginVertical: 4,
  },
  heroTrackFill: {
    height: "100%",
    backgroundColor: colors.textPrimary,
    borderRadius: 2,
  },
  heroPillsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: 4,
  },
  heroPill: {
    flex: 1,
    borderRadius: 12,
    padding: spacing.sm + 2,
    borderWidth: 1,
    gap: 2,
  },
  heroPillReceived: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderColor: "rgba(255, 255, 255, 0.10)",
  },
  heroPillExpected: {
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderColor: "rgba(255, 255, 255, 0.07)",
  },
  pillIndicatorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  pillLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  pillValue: {
    fontSize: 15,
    fontWeight: "800",
    marginTop: 2,
  },

  // Filter Chips
  filterRow: { flexDirection: "row", gap: spacing.sm, justifyContent: "center", marginTop: 2 },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: 999,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderColor: colors.borderLight,
  },
  filterText: { color: colors.textSecondary, fontSize: 13, fontWeight: "600" },
  filterTextActive: { color: colors.textPrimary, fontWeight: "700" },

  // List Rows
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
  rowSubtitle: { ...typography.small, color: colors.textMuted, marginTop: 2 },
  rowEnd: { alignItems: "flex-end", gap: spacing.xs },
  amount: { ...typography.body, fontWeight: "800", color: colors.textPrimary, fontSize: 15 },

  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  statusPillReceived: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderColor: "rgba(255, 255, 255, 0.14)",
  },
  statusPillExpected: {
    backgroundColor: colors.warningMuted,
    borderColor: "rgba(245, 158, 11, 0.25)",
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "700",
  },

  // FAB
  fab: {
    position: "absolute",
    right: spacing.lg,
    bottom: spacing.xl,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
});
