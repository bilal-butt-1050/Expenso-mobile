import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SectionList,
  TextInput,
  RefreshControl,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useExpenses } from "../../hooks/useExpenses";
import { useIncome } from "../../hooks/useIncome";
import { useLoans } from "../../hooks/useLoans";
import { useCategories } from "../../hooks/useCategories";
import { useAppData } from "../../context/AppDataContext";
import { ScreenContainer } from "../../components/ScreenContainer";
import { MonthPicker } from "../../components/MonthPicker";
import { AnimatedSegmentedControl, SegmentOption } from "../../components/AnimatedSegmentedControl";
import { EmptyState } from "../../components/EmptyState";
import { ListScreenSkeleton } from "../../components/Skeleton";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { formatCurrency } from "../../utils/currency";
import { formatDate } from "../../utils/date";
import { hapticLight, hapticSuccess } from "../../utils/haptics";
import { RootStackParamList } from "../../types/navigation";
import { Expense, Income, Loan } from "../../types/models";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type ActivityTab = "ALL" | "EXPENSES" | "INCOME" | "LOANS";

interface UnifiedItem {
  id: string;
  type: "EXPENSE" | "INCOME" | "LOAN";
  title: string;
  subtitle: string;
  amount: number;
  date: string | Date;
  icon: string;
  color: string;
  statusText?: string;
  statusColor?: string;
  raw: Expense | Income | Loan;
}

const TAB_OPTIONS: SegmentOption<ActivityTab>[] = [
  { label: "All", value: "ALL", icon: "view-list" },
  { label: "Expenses", value: "EXPENSES", icon: "arrow-down" },
  { label: "Income", value: "INCOME", icon: "arrow-up" },
  { label: "Loans", value: "LOANS", icon: "hand-coin" },
];

export function ActivityScreen() {
  const navigation = useNavigation<Nav>();
  const { selectedMonth, setSelectedMonth } = useAppData();
  const [activeTab, setActiveTab] = useState<ActivityTab>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const {
    data: expensesData,
    isLoading: expensesLoading,
    refetch: refetchExpenses,
    toggleStatus,
  } = useExpenses();

  const {
    data: incomeData,
    isLoading: incomeLoading,
    refetch: refetchIncome,
  } = useIncome();

  const {
    loans,
    isLoading: loansLoading,
    refresh: refetchLoans,
  } = useLoans();

  const { data: categoriesData } = useCategories();
  const categories = categoriesData || [];

  const isLoading = expensesLoading && incomeLoading && loansLoading;

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      refetchExpenses?.(),
      refetchIncome?.(),
      refetchLoans(),
    ]);
  }, [refetchExpenses, refetchIncome, refetchLoans]);

  // Normalize all records into UnifiedItem format
  const unifiedItems = useMemo<UnifiedItem[]>(() => {
    const list: UnifiedItem[] = [];

    // 1. Expenses
    if (activeTab === "ALL" || activeTab === "EXPENSES") {
      (expensesData || []).forEach((exp) => {
        list.push({
          id: `exp-${exp.id}`,
          type: "EXPENSE",
          title: exp.description || exp.category?.name || "Expense",
          subtitle: `${exp.category?.name || "Uncategorized"} • ${exp.paymentMethod || "Cash"} • ${exp.needWant}`,
          amount: exp.amount,
          date: exp.date,
          icon: exp.category?.icon || "receipt",
          color: exp.category?.color || colors.accent,
          statusText: exp.status,
          statusColor: exp.status === "Paid" ? colors.success : colors.warning,
          raw: exp,
        });
      });
    }

    // 2. Income
    if (activeTab === "ALL" || activeTab === "INCOME") {
      (incomeData || []).forEach((inc) => {
        list.push({
          id: `inc-${inc.id}`,
          type: "INCOME",
          title: inc.source || inc.description || "Income",
          subtitle: `${inc.source} • ${inc.paymentMethod || "Bank"}`,
          amount: inc.amount,
          date: inc.date,
          icon: inc.sourceIcon || "wallet-plus",
          color: inc.sourceColor || colors.success,
          statusText: "Received",
          statusColor: colors.success,
          raw: inc,
        });
      });
    }

    // 3. Loans
    if (activeTab === "ALL" || activeTab === "LOANS") {
      (loans || []).forEach((loan) => {
        const isLent = loan.type === "LENT";
        const remaining = Math.max(0, loan.amount - loan.settledAmount);
        list.push({
          id: `loan-${loan.id}`,
          type: "LOAN",
          title: `${isLent ? "Lent to" : "Borrowed from"} ${loan.personName}`,
          subtitle: `${loan.status} • Bal: ${formatCurrency(remaining)}`,
          amount: loan.amount,
          date: loan.createdAt,
          icon: isLent ? "hand-coin-outline" : "hand-coin",
          color: isLent ? colors.warning : colors.danger,
          statusText: loan.status,
          statusColor:
            loan.status === "SETTLED"
              ? colors.success
              : loan.status === "PARTIAL"
              ? colors.warning
              : colors.danger,
          raw: loan,
        });
      });
    }

    // Filter by search query
    let filtered = list;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.subtitle.toLowerCase().includes(q)
      );
    }

    // Filter by selected category (for expenses)
    if (selectedCategory) {
      filtered = filtered.filter(
        (item) =>
          item.type === "EXPENSE" &&
          (item.raw as Expense).categoryId === selectedCategory
      );
    }

    // Sort by date descending
    filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return filtered;
  }, [expensesData, incomeData, loans, activeTab, searchQuery, selectedCategory]);

  // Group into date sections (Today, Yesterday, or formatted date)
  const sections = useMemo(() => {
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    const groups: Record<string, UnifiedItem[]> = {};

    unifiedItems.forEach((item) => {
      const itemDate = new Date(item.date);
      const itemDateStr = itemDate.toDateString();

      let headerTitle: string;
      if (itemDateStr === today) {
        headerTitle = "Today";
      } else if (itemDateStr === yesterday) {
        headerTitle = "Yesterday";
      } else {
        headerTitle = formatDate(
          typeof item.date === "string" ? item.date : item.date.toISOString()
        );
      }

      if (!groups[headerTitle]) {
        groups[headerTitle] = [];
      }
      groups[headerTitle].push(item);
    });

    return Object.keys(groups).map((title) => ({
      title,
      data: groups[title],
    }));
  }, [unifiedItems]);

  // Aggregate metrics for active view
  const totals = useMemo(() => {
    let inflow = 0;
    let outflow = 0;
    unifiedItems.forEach((i) => {
      if (i.type === "INCOME") inflow += i.amount;
      if (i.type === "EXPENSE") outflow += i.amount;
    });
    return { inflow, outflow, net: inflow - outflow };
  }, [unifiedItems]);

  const handleRowPress = (item: UnifiedItem) => {
    hapticLight();
    if (item.type === "EXPENSE") {
      navigation.navigate("ExpenseForm", { expense: item.raw as Expense });
    } else if (item.type === "INCOME") {
      navigation.navigate("IncomeForm", { income: item.raw as Income });
    } else if (item.type === "LOAN") {
      navigation.navigate("Loans");
    }
  };

  const handleToggleStatus = async (item: UnifiedItem) => {
    if (item.type === "EXPENSE") {
      hapticSuccess();
      await toggleStatus((item.raw as Expense).id);
    }
  };

  return (
    <ScreenContainer style={styles.noPad}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.monthWrap}>
          <MonthPicker month={selectedMonth} onChange={setSelectedMonth} />
        </View>
        <Text style={styles.headerTitle}>Activity</Text>
      </View>

      {/* Segmented Control */}
      <View style={styles.segmentedWrap}>
        <AnimatedSegmentedControl
          options={TAB_OPTIONS}
          selected={activeTab}
          onChange={(tab) => {
            setActiveTab(tab);
            setSelectedCategory(null);
          }}
        />
      </View>

      {/* Search Bar */}
      <View style={styles.searchBarWrap}>
        <View style={styles.searchContainer}>
          <MaterialCommunityIcons
            name="magnify"
            size={20}
            color={colors.textMuted}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search transactions, people..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialCommunityIcons
                name="close-circle"
                size={18}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category Pills (Active on Expenses/All tab) */}
      {(activeTab === "ALL" || activeTab === "EXPENSES") && categories.length > 0 && (
        <View style={styles.categoriesScroll}>
          <TouchableOpacity
            style={[
              styles.catChip,
              !selectedCategory && styles.catChipActive,
            ]}
            onPress={() => setSelectedCategory(null)}
          >
            <Text
              style={[
                styles.catChipText,
                !selectedCategory && styles.catChipTextActive,
              ]}
            >
              All Categories
            </Text>
          </TouchableOpacity>
          {categories.map((cat: any) => {
            const isCatActive = selectedCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.catChip,
                  isCatActive && {
                    backgroundColor: cat.color,
                    borderColor: cat.color,
                  },
                ]}
                onPress={() =>
                  setSelectedCategory(isCatActive ? null : cat.id)
                }
              >
                <MaterialCommunityIcons
                  name={cat.icon as any}
                  size={14}
                  color={isCatActive ? colors.textPrimary : cat.color}
                  style={{ marginRight: 4 }}
                />
                <Text
                  style={[
                    styles.catChipText,
                    isCatActive && styles.catChipTextActive,
                  ]}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Summary Mini-Card */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Outflow</Text>
          <Text style={[styles.summaryValue, { color: colors.danger }]}>
            {formatCurrency(totals.outflow)}
          </Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Inflow</Text>
          <Text style={[styles.summaryValue, { color: colors.success }]}>
            {formatCurrency(totals.inflow)}
          </Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Net</Text>
          <Text
            style={[
              styles.summaryValue,
              { color: totals.net >= 0 ? colors.accent : colors.danger },
            ]}
          >
            {formatCurrency(totals.net)}
          </Text>
        </View>
      </View>

      {/* Transaction Feed */}
      {isLoading ? (
        <ListScreenSkeleton />
      ) : sections.length === 0 ? (
        <EmptyState
          title="No transactions found"
          subtitle={
            searchQuery
              ? `No records matching "${searchQuery}"`
              : "Tap the (+) button below to log your first record."
          }
          icon="receipt-text-outline"
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={handleRefresh}
              tintColor={colors.accent}
            />
          }
          renderSectionHeader={({ section: { title } }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderText}>{title}</Text>
            </View>
          )}
          renderItem={({ item }) => {
            const isIncome = item.type === "INCOME";
            const isLoan = item.type === "LOAN";
            const isExpense = item.type === "EXPENSE";

            return (
              <TouchableOpacity
                style={styles.rowCard}
                activeOpacity={0.7}
                onPress={() => handleRowPress(item)}
              >
                {/* Icon Circle */}
                <View
                  style={[
                    styles.iconCircle,
                    { backgroundColor: `${item.color}20` },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={item.icon as any}
                    size={22}
                    color={item.color}
                  />
                </View>

                {/* Details */}
                <View style={styles.detailsWrap}>
                  <Text style={styles.itemTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.itemSubtitle} numberOfLines={1}>
                    {item.subtitle}
                  </Text>
                </View>

                {/* Amount & Status Action */}
                <View style={styles.rightWrap}>
                  <Text
                    style={[
                      styles.amountText,
                      isIncome
                        ? { color: colors.success }
                        : isExpense
                        ? { color: colors.danger }
                        : { color: colors.warning },
                    ]}
                  >
                    {isIncome ? "+" : isExpense ? "-" : ""}
                    {formatCurrency(item.amount)}
                  </Text>

                  {/* Interactive status badge for expenses, static for others */}
                  {isExpense ? (
                    <TouchableOpacity
                      style={[
                        styles.statusChip,
                        { backgroundColor: `${item.statusColor}20` },
                      ]}
                      onPress={() => handleToggleStatus(item)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <MaterialCommunityIcons
                        name={
                          item.statusText === "Paid"
                            ? "check-circle"
                            : "clock-outline"
                        }
                        size={12}
                        color={item.statusColor}
                        style={{ marginRight: 3 }}
                      />
                      <Text
                        style={[
                          styles.statusChipText,
                          { color: item.statusColor },
                        ]}
                      >
                        {item.statusText}
                      </Text>
                    </TouchableOpacity>
                  ) : item.statusText ? (
                    <View
                      style={[
                        styles.statusChip,
                        { backgroundColor: `${item.statusColor}20` },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusChipText,
                          { color: item.statusColor },
                        ]}
                      >
                        {item.statusText}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  noPad: {
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  monthWrap: {
    flex: 1,
    marginRight: spacing.md,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  segmentedWrap: {
    paddingHorizontal: spacing.md,
    marginVertical: spacing.xs,
  },
  searchBarWrap: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.xs,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    padding: 0,
  },
  categoriesScroll: {
    flexDirection: "row",
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  catChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  catChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  catChipText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  catChipTextActive: {
    color: colors.textPrimary,
    fontWeight: "700",
  },
  summaryBar: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryDivider: {
    width: 1,
    backgroundColor: colors.borderLight,
  },
  summaryLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "700",
    marginTop: 2,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: 140, // Required bottom padding for elevated tab bar
  },
  sectionHeader: {
    backgroundColor: colors.background,
    paddingVertical: spacing.xs,
    marginTop: spacing.sm,
  },
  sectionHeaderText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  rowCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  detailsWrap: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  itemSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  rightWrap: {
    alignItems: "flex-end",
    marginLeft: spacing.sm,
  },
  amountText: {
    fontSize: 15,
    fontWeight: "700",
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.pill,
    marginTop: 4,
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: "600",
  },
});
