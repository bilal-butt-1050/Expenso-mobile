import React, { useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View, Switch, Modal } from "react-native";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Filter = IncomeStatus | "All";

export function IncomeListScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { selectedMonth, setSelectedMonth } = useAppData();
  const { confirm } = useDialog();
  const [filter, setFilter] = useState<Filter>("All");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

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
      },
    });
  };

  const handleToggleStatus = async (income: Income) => {
    await toggleStatus(income.id);
  };

  return (
    <ScreenContainer style={styles.noPad}>
      <View style={styles.top}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Income</Text>
          <TouchableOpacity onPress={() => setIsFilterOpen(true)} hitSlop={10}>
            <MaterialCommunityIcons name="filter-variant" size={24} color={filter !== "All" ? colors.accent : colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <MonthPicker month={selectedMonth} onChange={setSelectedMonth} />

        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroLabel}>TOTAL</Text>
          <Text style={styles.heroAmount} numberOfLines={1} adjustsFontSizeToFit>
            {formatCurrency(totalIncome)}
          </Text>
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
        renderItem={({ item }) => (
          <IncomeItem
            item={item}
            onPress={() => navigation.navigate("IncomeForm", { income: item })}
            onLongPress={() => confirmDelete(item)}
            onToggleStatus={() => handleToggleStatus(item)}
          />
        )}
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

      <Modal visible={isFilterOpen} transparent animationType="slide" onRequestClose={() => setIsFilterOpen(false)}>
        <TouchableOpacity style={styles.sheetBackdrop} activeOpacity={1} onPress={() => setIsFilterOpen(false)}>
          <TouchableOpacity activeOpacity={1} style={[styles.sheetContent, { paddingBottom: Math.max(insets.bottom, 16) + spacing.md }]}>
            <View style={styles.sheetDragHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Filter Income</Text>
              <TouchableOpacity onPress={() => setIsFilterOpen(false)} hitSlop={12}>
                <MaterialCommunityIcons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            {(["All", "Received", "Expected"] as Filter[]).map((f) => {
              const isSelected = filter === f;
              return (
                <TouchableOpacity
                  key={f}
                  style={[styles.optionRow, isSelected && styles.optionRowSelected]}
                  onPress={() => { setFilter(f); setIsFilterOpen(false); }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>{f}</Text>
                  {isSelected && <MaterialCommunityIcons name="check" size={20} color={colors.textPrimary} />}
                </TouchableOpacity>
              );
            })}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </ScreenContainer>
  );
}

function IncomeItem({
  item,
  onPress,
  onLongPress,
  onToggleStatus,
}: {
  item: Income;
  onPress: () => void;
  onLongPress: () => void;
  onToggleStatus: () => void;
}) {
  const [isReceived, setIsReceived] = React.useState(item.status === "Received");

  React.useEffect(() => {
    setIsReceived(item.status === "Received");
  }, [item.status]);

  const handleToggle = () => {
    setIsReceived(!isReceived);
    onToggleStatus();
  };

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${item.source}, ${formatCurrency(item.amount)}, ${isReceived ? "Received" : "Expected"}`}
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
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
          <Text style={{ fontSize: 13, fontWeight: "600", color: isReceived ? colors.success : colors.warning }}>
            {isReceived ? "Received" : "Expected"}
          </Text>
          <Switch
            value={isReceived}
            onValueChange={handleToggle}
            trackColor={{ false: colors.border, true: colors.success }}
            thumbColor={colors.textPrimary}
            style={{ transform: [{ scale: 0.7 }] }}
          />
        </View>
      </View>
    </TouchableOpacity>
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
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
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

  sheetBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "flex-end",
  },
  sheetContent: {
    backgroundColor: colors.surfaceRaised,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  sheetDragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginBottom: spacing.md,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  sheetTitle: { fontSize: 18, fontWeight: "700", color: colors.textPrimary },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionRowSelected: { backgroundColor: "rgba(255,255,255,0.03)" },
  optionText: { flex: 1, fontSize: 16, color: colors.textSecondary, fontWeight: "500" },
  optionTextSelected: { color: colors.textPrimary, fontWeight: "700" },
});
