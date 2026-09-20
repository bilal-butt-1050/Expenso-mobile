import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SectionList,
  TextInput,
  RefreshControl,
  LayoutAnimation,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useExpenses } from "../../hooks/useExpenses";
import { useIncome } from "../../hooks/useIncome";
import { useLoans } from "../../hooks/useLoans";
import { useAppData } from "../../context/AppDataContext";
import { useDialog } from "../../context/DialogContext";
import { ScreenContainer } from "../../components/ScreenContainer";
import { MonthPicker } from "../../components/MonthPicker";
import { AnimatedSegmentedControl, SegmentOption } from "../../components/AnimatedSegmentedControl";
import { EmptyState } from "../../components/EmptyState";
import { ListScreenSkeleton } from "../../components/Skeleton";
import {
  SwipeableActivityRow,
  UnifiedActivityItem,
} from "../../components/SwipeableActivityRow";
import { LoanSettleSheet } from "../../components/LoanSettleSheet";
import { syncService } from "../../services/syncService";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { formatCurrency } from "../../utils/currency";
import { formatDate } from "../../utils/date";
import { hapticLight, hapticDelete } from "../../utils/haptics";
import { TabParamList, RootStackParamList } from "../../types/navigation";
import { Expense, Income, Loan } from "../../types/models";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type ActivityTab = "ALL" | "EXPENSES" | "INCOME" | "LOANS";

const TAB_OPTIONS: SegmentOption<ActivityTab>[] = [
  { label: "All", value: "ALL" },
  { label: "Expenses", value: "EXPENSES" },
  { label: "Income", value: "INCOME" },
  { label: "Loans", value: "LOANS" },
];

export function ActivityScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<TabParamList, "Activity">>();
  const { selectedMonth, setSelectedMonth } = useAppData();
  const { confirm } = useDialog();

  const [activeTab, setActiveTab] = useState<ActivityTab>(
    route.params?.filter || "ALL"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [settlingLoan, setSettlingLoan] = useState<Loan | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [syncState, setSyncState] = useState<{ isSyncing: boolean; pendingCount: number }>({
    isSyncing: false,
    pendingCount: 0,
  });

  const highlightId = route.params?.highlightId;

  // React to route params filter changes
  useEffect(() => {
    if (route.params?.filter) {
      setActiveTab(route.params.filter);
    }
  }, [route.params?.filter]);

  // Subscribe to offline sync outbox status
  useEffect(() => {
    return syncService.subscribe((state) => {
      setSyncState(state);
    });
  }, []);

  const {
    data: expensesData,
    isLoading: expensesLoading,
    refetch: refetchExpenses,
    removeExpense,
  } = useExpenses();

  const {
    data: incomeData,
    isLoading: incomeLoading,
    refetch: refetchIncome,
    removeIncome,
  } = useIncome();

  const {
    loans,
    summary: loansSummary,
    isLoading: loansLoading,
    refresh: refetchLoans,
    recordPayment,
    removeLoan,
  } = useLoans();

  const isLoading = expensesLoading && incomeLoading && loansLoading;

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      refetchExpenses?.(),
      refetchIncome?.(),
      refetchLoans(),
      syncService.syncPendingActions(),
    ]);
  }, [refetchExpenses, refetchIncome, refetchLoans]);

  // Aggregate all transactions calmly into UnifiedActivityItem format
  const unifiedItems = useMemo<UnifiedActivityItem[]>(() => {
    const list: UnifiedActivityItem[] = [];

    // 1. Expenses
    if (activeTab === "ALL" || activeTab === "EXPENSES") {
      (expensesData || []).forEach((exp) => {
        list.push({
          id: `exp-${exp.id}`,
          rawId: exp.id,
          type: "EXPENSE",
          title: exp.description || exp.category?.name || "Expense",
          subtitle: exp.category?.name || "Uncategorized",
          amount: exp.amount,
          date: exp.date,
          icon: exp.category?.icon || "credit-card-outline",
          raw: exp,
        });
      });
    }

    // 2. Income
    if (activeTab === "ALL" || activeTab === "INCOME") {
      (incomeData || []).forEach((inc) => {
        list.push({
          id: `inc-${inc.id}`,
          rawId: inc.id,
          type: "INCOME",
          title: inc.source || inc.description || "Income",
          subtitle: inc.paymentMethod || "Direct Deposit",
          amount: inc.amount,
          date: inc.date,
          icon: inc.sourceIcon || "wallet-plus-outline",
          isIncome: true,
          raw: inc,
        });
      });
    }

    // 3. Loans
    if (activeTab === "ALL" || activeTab === "LOANS") {
      (loans || []).forEach((loan) => {
        const isLent = loan.type === "LENT";
        const isSettled = loan.status === "SETTLED";
        list.push({
          id: `loan-${loan.id}`,
          rawId: loan.id,
          type: "LOAN",
          title: `${isLent ? "Lent to" : "Borrowed from"} ${loan.personName}`,
          subtitle: isSettled
            ? "Fully Settled"
            : `Remaining: ${formatCurrency(Math.max(0, loan.amount - loan.settledAmount))}`,
          amount: loan.amount,
          date: loan.createdAt,
          icon: isLent ? "arrow-top-right" : "arrow-bottom-left",
          isSettled,
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

    const groups: Record<string, UnifiedActivityItem[]> = {};

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

  const handleRowPress = (item: UnifiedActivityItem) => {
    hapticLight();
    if (item.type === "EXPENSE") {
      navigation.navigate("ExpenseForm", { expense: item.raw as Expense });
    } else if (item.type === "INCOME") {
      navigation.navigate("IncomeForm", { income: item.raw as Income });
    } else if (item.type === "LOAN") {
      setSettlingLoan(item.raw as Loan);
    }
  };

  const confirmDeleteItem = (item: UnifiedActivityItem) => {
    const typeLabel =
      item.type === "EXPENSE" ? "Expense" : item.type === "INCOME" ? "Income" : "Loan";

    confirm({
      title: `Delete ${typeLabel}?`,
      message: `Are you sure you want to delete "${item.title}" for ${formatCurrency(item.amount)}?`,
      destructive: true,
      confirmText: "Delete",
      onConfirm: async () => {
        hapticDelete();
        setDeletingId(item.id);
        try {
          if (item.type === "EXPENSE") {
            await removeExpense(item.rawId);
          } else if (item.type === "INCOME") {
            await removeIncome(item.rawId);
          } else if (item.type === "LOAN") {
            await removeLoan(item.rawId);
          }
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        } catch {
        } finally {
          setDeletingId(null);
        }
      },
    });
  };

  return (
    <ScreenContainer style={styles.noPad}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.monthWrap}>
          <MonthPicker month={selectedMonth} onChange={setSelectedMonth} />
        </View>
        <Text style={styles.headerTitle}>Activity</Text>

        {/* Offline Sync Banner if pending items exist */}
        {syncState.pendingCount > 0 && (
          <TouchableOpacity
            style={styles.offlineBanner}
            onPress={() => syncService.syncPendingActions()}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons
              name={syncState.isSyncing ? "sync" : "cloud-clock-outline"}
              size={14}
              color={colors.warning}
            />
            <Text style={styles.offlineBannerText}>
              {syncState.isSyncing
                ? "Syncing changes with server..."
                : `${syncState.pendingCount} offline change(s) • Tap to sync`}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Segmented Control */}
      <View style={styles.segmentedWrap}>
        <AnimatedSegmentedControl
          options={TAB_OPTIONS}
          selected={activeTab}
          onChange={(tab) => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setActiveTab(tab);
          }}
        />
      </View>

      {/* Minimal Search Bar */}
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

      {/* Transaction Feed */}
      {isLoading ? (
        <ListScreenSkeleton />
      ) : sections.length === 0 ? (
        <EmptyState
          title="No transactions"
          subtitle={
            searchQuery
              ? `No records found for "${searchQuery}"`
              : activeTab === "LOANS"
              ? "No active debts or loans recorded."
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
          ListHeaderComponent={
            activeTab === "LOANS" && loansSummary ? (
              <View style={styles.loansOverviewCard}>
                <View style={styles.loanCol}>
                  <Text style={styles.loanColLabel}>OWED TO YOU</Text>
                  <Text style={[styles.loanColValue, { color: colors.success }]}>
                    {formatCurrency(loansSummary.totalLentPending)}
                  </Text>
                </View>
                <View style={styles.loanDivider} />
                <View style={styles.loanCol}>
                  <Text style={styles.loanColLabel}>YOU OWE</Text>
                  <Text style={[styles.loanColValue, { color: colors.danger }]}>
                    {formatCurrency(loansSummary.totalBorrowedPending)}
                  </Text>
                </View>
              </View>
            ) : null
          }
          renderSectionHeader={({ section: { title } }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderText}>{title}</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <SwipeableActivityRow
              item={item}
              isNewlyAdded={item.rawId === highlightId}
              isDeleting={item.id === deletingId}
              onPress={() => handleRowPress(item)}
              onDelete={() => confirmDeleteItem(item)}
            />
          )}
        />
      )}

      {/* Inline Loan Settlement & Inspection Modal */}
      <LoanSettleSheet
        loan={settlingLoan}
        onClose={() => setSettlingLoan(null)}
        onSettle={async (loanId, amount) => {
          await recordPayment(loanId, amount);
          await handleRefresh();
        }}
        onDelete={(loanId) => {
          const matching = unifiedItems.find((u) => u.rawId === loanId);
          if (matching) confirmDeleteItem(matching);
        }}
      />
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
  offlineBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: spacing.xs,
    alignSelf: "flex-start",
  },
  offlineBannerText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.warning,
  },
  segmentedWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    backgroundColor: colors.background,
  },
  searchBarWrap: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    backgroundColor: colors.background,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 42,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
    paddingVertical: 0,
  },
  loansOverviewCard: {
    flexDirection: "row",
    backgroundColor: colors.surfaceRaised,
    borderRadius: 18,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  loanCol: {
    flex: 1,
    alignItems: "center",
  },
  loanDivider: {
    width: 1,
    backgroundColor: colors.borderLight,
  },
  loanColLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.textMuted,
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  loanColValue: {
    fontSize: 16,
    fontWeight: "700",
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 140, // Generous clearance for bottom bar & FAB
  },
  sectionHeader: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    backgroundColor: colors.background,
  },
  sectionHeaderText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textMuted,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
});
