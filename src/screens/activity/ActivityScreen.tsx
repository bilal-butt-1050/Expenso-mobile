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
  isUnpaid?: boolean;
  raw: Expense | Income | Loan;
}

const TAB_OPTIONS: SegmentOption<ActivityTab>[] = [
  { label: "All", value: "ALL" },
  { label: "Expenses", value: "EXPENSES" },
  { label: "Income", value: "INCOME" },
  { label: "Loans", value: "LOANS" },
];

export function ActivityScreen() {
  const navigation = useNavigation<Nav>();
  const { selectedMonth, setSelectedMonth } = useAppData();
  const [activeTab, setActiveTab] = useState<ActivityTab>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

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

  const isLoading = expensesLoading && incomeLoading && loansLoading;

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      refetchExpenses?.(),
      refetchIncome?.(),
      refetchLoans(),
    ]);
  }, [refetchExpenses, refetchIncome, refetchLoans]);

  // Aggregate all transactions calmly into UnifiedItem format
  const unifiedItems = useMemo<UnifiedItem[]>(() => {
    const list: UnifiedItem[] = [];

    // 1. Expenses
    if (activeTab === "ALL" || activeTab === "EXPENSES") {
      (expensesData || []).forEach((exp) => {
        list.push({
          id: `exp-${exp.id}`,
          type: "EXPENSE",
          title: exp.description || exp.category?.name || "Expense",
          subtitle: exp.category?.name || "Uncategorized",
          amount: exp.amount,
          date: exp.date,
          icon: exp.category?.icon || "credit-card-outline",
          isUnpaid: exp.status === "Unpaid",
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
          subtitle: inc.paymentMethod || "Direct Deposit",
          amount: inc.amount,
          date: inc.date,
          icon: inc.sourceIcon || "wallet-plus-outline",
          raw: inc,
        });
      });
    }

    // 3. Loans
    if (activeTab === "ALL" || activeTab === "LOANS") {
      (loans || []).forEach((loan) => {
        const isLent = loan.type === "LENT";
        list.push({
          id: `loan-${loan.id}`,
          type: "LOAN",
          title: `${isLent ? "Lent to" : "Borrowed from"} ${loan.personName}`,
          subtitle: loan.status === "SETTLED" ? "Settled" : "Active loan",
          amount: loan.amount,
          date: loan.createdAt,
          icon: isLent ? "arrow-up-right" : "arrow-down-left",
          raw: loan,
        });
      });
    }

    // Filter by live search query
    let filtered = list;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.subtitle.toLowerCase().includes(q)
      );
    }

    // Sort by date descending
    filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return filtered;
  }, [expensesData, incomeData, loans, activeTab, searchQuery]);

  // Group into clean date sections
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
      {/* Calm Header */}
      <View style={styles.header}>
        <View style={styles.monthWrap}>
          <MonthPicker month={selectedMonth} onChange={setSelectedMonth} />
        </View>
        <Text style={styles.headerTitle}>Activity</Text>
      </View>

      {/* Understated Segmented Control */}
      <View style={styles.segmentedWrap}>
        <AnimatedSegmentedControl
          options={TAB_OPTIONS}
          selected={activeTab}
          onChange={(tab) => setActiveTab(tab)}
        />
      </View>

      {/* Minimal, Quiet Search Bar */}
      <View style={styles.searchBarWrap}>
        <View style={styles.searchContainer}>
          <MaterialCommunityIcons
            name="magnify"
            size={18}
            color={colors.textMuted}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search transactions..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialCommunityIcons
                name="close-circle"
                size={16}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Cozy, Peaceful Transaction Feed */}
      {isLoading ? (
        <ListScreenSkeleton />
      ) : sections.length === 0 ? (
        <EmptyState
          title="No transactions"
          subtitle={
            searchQuery
              ? `No records found for "${searchQuery}"`
              : "Transactions you log will appear here."
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

            return (
              <TouchableOpacity
                style={styles.rowCard}
                activeOpacity={0.7}
                onPress={() => handleRowPress(item)}
                accessibilityRole="button"
                accessibilityLabel={`${item.title}, ${formatCurrency(item.amount)}`}
              >
                {/* Minimal Neutral Icon Circle */}
                <View style={styles.iconCircle}>
                  <MaterialCommunityIcons
                    name={item.icon as any}
                    size={20}
                    color={colors.textPrimary}
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

                {/* Right: Amount & Quiet Unpaid Indicator */}
                <View style={styles.rightWrap}>
                  <Text
                    style={[
                      styles.amountText,
                      isIncome ? styles.amountIncome : styles.amountDefault,
                    ]}
                  >
                    {isIncome ? "+" : ""}
                    {formatCurrency(item.amount)}
                  </Text>

                  {item.isUnpaid && (
                    <TouchableOpacity
                      style={styles.unpaidPill}
                      onPress={() => handleToggleStatus(item)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      accessibilityRole="button"
                      accessibilityLabel="Mark as paid"
                    >
                      <View style={styles.unpaidDot} />
                      <Text style={styles.unpaidText}>Unpaid</Text>
                    </TouchableOpacity>
                  )}
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
  noPad: { paddingHorizontal: 0 },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    backgroundColor: colors.background,
  },
  monthWrap: {
    marginBottom: spacing.xs,
  },
  headerTitle: {
    ...typography.title,
    fontSize: 26,
    letterSpacing: -0.4,
    color: colors.textPrimary,
  },

  segmentedWrap: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },

  searchBarWrap: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    paddingVertical: 0,
  },

  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 140,
  },
  sectionHeader: {
    paddingTop: spacing.md,
    paddingBottom: 6,
    backgroundColor: colors.background,
  },
  sectionHeaderText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },

  rowCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 18,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  detailsWrap: {
    flex: 1,
    marginRight: spacing.sm,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 2,
  },
  itemSubtitle: {
    fontSize: 12,
    fontWeight: "400",
    color: colors.textMuted,
  },
  rightWrap: {
    alignItems: "flex-end",
  },
  amountText: {
    fontSize: 15,
    fontWeight: "700",
  },
  amountIncome: {
    color: colors.success,
  },
  amountDefault: {
    color: colors.textPrimary,
  },
  unpaidPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: 10,
    marginTop: 4,
    gap: 4,
  },
  unpaidDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.warning,
  },
  unpaidText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.warning,
  },
});
