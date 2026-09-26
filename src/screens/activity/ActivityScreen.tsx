import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SectionList,
  RefreshControl,
  LayoutAnimation,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTransactions, useTransactionMutations } from "../../hooks/useTransactions";
import { useLoans } from "../../hooks/useLoans";
import { useAppData } from "../../context/AppDataContext";
import { useDialog } from "../../context/DialogContext";
import { ScreenContainer } from "../../components/ScreenContainer";
import { MonthPicker } from "../../components/MonthPicker";
import { AnimatedSegmentedControl, SegmentOption } from "../../components/AnimatedSegmentedControl";
import { EmptyState } from "../../components/EmptyState";
import { Button } from "../../components/Button";
import { ListScreenSkeleton } from "../../components/Skeleton";
import {
  SwipeableActivityRow,
  UnifiedActivityItem,
} from "../../components/SwipeableActivityRow";
import { LoanSettleSheet } from "../../components/LoanSettleSheet";
import { usePendingWriteCount } from "../../lib/onlineStatus";
import { useTabBarPadding } from "../../hooks/useTabBarPadding";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { formatCurrency } from "../../utils/currency";
import { formatDate } from "../../utils/date";
import { getErrorMessage } from "../../api/client";
import { hapticLight, hapticDelete } from "../../utils/haptics";
import { useSnackbar } from "../../components/snackbar/SnackbarContext";
import { useReduceMotion } from "../../hooks/useReduceMotion";
import { TabParamList, RootStackParamList } from "../../types/navigation";
import { CASH_SIGN, Loan, Transaction, TransactionKind } from "../../types/models";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type ActivityTab = "ALL" | "EXPENSES" | "INCOME" | "LOANS";

/** Which ledger kinds each segment shows. Loans are positions and come from the loan list. */
const KINDS_FOR_TAB: Record<ActivityTab, TransactionKind[] | undefined> = {
  ALL: undefined,
  EXPENSES: ["SPEND"],
  INCOME: ["EARN"],
  LOANS: [],
};

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
  const { confirm, alert } = useDialog();
  const bottomPadding = useTabBarPadding();

  const [activeTab, setActiveTab] = useState<ActivityTab>(
    route.params?.filter || "ALL"
  );
  const [settlingLoan, setSettlingLoan] = useState<Loan | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  // Swipe-deleted rows waiting out the undo window, or queued while offline. Hidden here and only
  // committed when the undo expires (R-4). Undo just removes the id, so the row returns in place.
  const [hiddenIds, setHiddenIds] = useState<ReadonlySet<string>>(() => new Set());
  const committedIds = useRef(new Set<string>());
  const snackbar = useSnackbar();
  const reduceMotion = useReduceMotion();
  // Real count of writes waiting on connectivity. The previous state was declared and never
  // set, so this banner could not appear and offline changes were invisible.
  const pendingWrites = usePendingWriteCount();

  const highlightId = route.params?.highlightId;

  // Apply an incoming filter, then clear it. The param is sticky otherwise: arriving with the
  // same value twice does not re-fire this effect, so a user who had switched segments in the
  // meantime saw the request silently ignored.
  useEffect(() => {
    const incoming = route.params?.filter;
    if (incoming) {
      setActiveTab(incoming);
      navigation.setParams({ filter: undefined });
    }
  }, [route.params?.filter, navigation]);

  // One paginated, month-filtered feed from the server, instead of merging three
  // independently-paginated sources in the client — which is what made month filtering,
  // ordering and the loading state all wrong at once.
  const kinds = KINDS_FOR_TAB[activeTab];
  const {
    items: transactions,
    isLoading: txLoading,
    error: txError,
    isRefreshing,
    hasMore,
    refetch: refetchTransactions,
    loadMore,
  } = useTransactions({ kinds });
  const { commitDelete } = useTransactionMutations();

  const {
    loans,
    summary: loansSummary,
    isLoading: loansLoading,
    error: loansError,
    refresh: refetchLoans,
    recordPayment,
    removeLoan,
  } = useLoans();

  const isLoading = (activeTab === "LOANS" ? loansLoading : txLoading) || false;

  const handleRefresh = useCallback(async () => {
    await Promise.all([refetchTransactions(), refetchLoans()]);
  }, [refetchTransactions, refetchLoans]);

  /**
   * Maps the ledger onto rows.
   *
   * Loan-linked movements carry the direction in their own description already, so they read
   * naturally in the feed without any of the client-side title rewriting the old code did.
   */
  const unifiedItems = useMemo<UnifiedActivityItem[]>(() => {
    if (activeTab === "LOANS") {
      return (loans || []).map((loan) => {
        const isLent = loan.type === "LENT";
        const isSettled = loan.status === "SETTLED";
        const remaining = Math.max(0, loan.amount - loan.settledAmount);
        return {
          id: `loan-${loan.id}`,
          rawId: loan.id,
          type: "LOAN" as const,
          // The counterparty is the identity of the record. Rows previously read only "Lent"
          // or "Borrowed", so every loan looked the same.
          title: loan.personName,
          subtitle: isSettled
            ? `${isLent ? "Lent" : "Borrowed"} · settled`
            : loan.settledAmount > 0
              ? `${isLent ? "Owed to you" : "You owe"} · ${formatCurrency(remaining)} left`
              : isLent
                ? "Owed to you"
                : "You owe",
          amount: loan.amount,
          date: loan.createdAt,
          icon: isLent ? "arrow-top-right" : "arrow-bottom-left",
          isSettled,
          raw: loan,
        };
      });
    }

    // Already ordered by the server on (date desc, id desc).
    return (transactions || []).filter((tx) => !hiddenIds.has(tx.id)).map((tx) => {
      const isIncoming = CASH_SIGN[tx.kind] > 0;
      const isLoanRow = Boolean(tx.loanId);

      const title = isLoanRow
        ? tx.description || "Loan movement"
        : tx.kind === "SPEND"
          ? tx.category?.name || tx.description || "Expense"
          : tx.source || tx.description || "Income";

      const subtitle = isLoanRow
        ? undefined
        : tx.kind === "SPEND"
          ? tx.category?.name
            ? tx.description || undefined
            : undefined
          : tx.source
            ? tx.description || undefined
            : undefined;

      return {
        id: tx.id,
        rawId: tx.id,
        type: tx.kind === "SPEND" ? ("EXPENSE" as const) : ("INCOME" as const),
        title,
        subtitle,
        amount: tx.amount,
        date: tx.date,
        icon: isLoanRow
          ? isIncoming
            ? "arrow-bottom-left"
            : "arrow-top-right"
          : tx.kind === "SPEND"
            ? tx.category?.icon || "credit-card-outline"
            : tx.sourceIcon || "wallet-plus-outline",
        isIncome: isIncoming,
        raw: tx,
      };
    });
  }, [transactions, loans, activeTab, hiddenIds]);

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

    if (item.type === "LOAN") {
      setSettlingLoan(item.raw as Loan);
      return;
    }

    const tx = item.raw as Transaction;

    // A loan's movements are owned by the loan; editing one directly would desynchronise it
    // from the loan's settled amount. Send the user to the loan instead.
    if (tx.loanId) {
      const loan = loans.find((l) => l.id === tx.loanId);
      if (loan) setSettlingLoan(loan);
      else navigation.navigate("Loans");
      return;
    }

    if (tx.kind === "SPEND") {
      navigation.navigate("ExpenseForm", { transaction: tx });
    } else {
      navigation.navigate("IncomeForm", { transaction: tx });
    }
  };

  const animateLayout = () => {
    if (!reduceMotion) LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  };

  const setHidden = (id: string, hidden: boolean) =>
    setHiddenIds((prev) => {
      const next = new Set(prev);
      if (hidden) next.add(id);
      else next.delete(id);
      return next;
    });

  /** A whole loan cascades its payments, so it keeps a confirm and gets no undo (D-33). */
  const confirmDeleteLoan = (item: UnifiedActivityItem) => {
    confirm({
      title: "Delete loan?",
      message: `${(item.raw as Loan).personName} · ${formatCurrency(item.amount)}. Any payments recorded against it go too.`,
      destructive: true,
      confirmText: "Delete",
      onConfirm: async () => {
        hapticDelete();
        setDeletingId(item.id);
        try {
          await removeLoan(item.rawId);
          animateLayout();
        } catch (err) {
          alert({ title: "Couldn't delete", message: getErrorMessage(err) });
        } finally {
          setDeletingId(null);
        }
      },
    });
  };

  /**
   * Swipe to delete, with undo (R-4, DESIGN §S4). The row disappears at once and nothing reaches
   * the server during the undo window. The delete commits exactly once when the window ends by
   * timeout, Android back, leaving the tabs or the app going to the background.
   */
  const swipeDelete = (item: UnifiedActivityItem) => {
    if (item.type === "LOAN") {
      confirmDeleteLoan(item);
      return;
    }

    const tx = item.raw as Transaction;
    // A loan's movements belong to the loan; deleting one here would desynchronise its balance.
    if (tx.loanId) {
      const loan = loans.find((l) => l.id === tx.loanId);
      hapticLight();
      snackbar.show({
        id: `S-4-${tx.id}`,
        text: loan
          ? `This is part of the loan with ${loan.personName}. Change it from the loan.`
          : "This is part of a loan. Change it from the loan.",
        icon: "link-variant",
        iconColor: colors.textSecondary,
        action: loan
          ? { label: "Open loan", a11yLabel: `Open the loan with ${loan.personName}`, onPress: () => setSettlingLoan(loan) }
          : undefined,
        duration: 6000,
        priority: 2,
      });
      return;
    }

    hapticDelete();
    animateLayout();
    setHidden(tx.id, true);
    snackbar.show({
      id: `S-1-${tx.id}`,
      text: `Deleted ${item.title} · ${formatCurrency(item.amount)}`,
      action: {
        label: "Undo",
        a11yLabel: `Undo deleting ${item.title}`,
        onPress: () => {
          animateLayout();
          setHidden(tx.id, false);
        },
      },
      duration: 5000,
      priority: 1,
      onExpire: () => {
        if (committedIds.current.has(tx.id)) return;
        committedIds.current.add(tx.id);
        commitDelete(tx.id, item.title, {
          // Failure: the defaults refetch the row and show "Couldn't delete"; stop hiding it.
          onError: () => setHidden(tx.id, false),
          // Success: the row is already out of the cache, so the hide is no longer needed.
          onSettled: () => setHidden(tx.id, false),
        });
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

        {pendingWrites > 0 && (
          <View style={styles.offlineBanner}>
            <MaterialCommunityIcons name="cloud-clock-outline" size={14} color={colors.warning} />
            <Text style={styles.offlineBannerText}>
              {pendingWrites} change{pendingWrites === 1 ? "" : "s"} waiting for connection
            </Text>
          </View>
        )}
      </View>

      {/* Segmented Control */}
      <View style={styles.segmentedWrap}>
        <AnimatedSegmentedControl
          options={TAB_OPTIONS}
          selected={activeTab}
          onChange={(tab) => {
            setActiveTab(tab);
          }}
        />
      </View>

      {/* Transaction Feed */}
      {isLoading ? (
        <ListScreenSkeleton />
      ) : sections.length === 0 && (activeTab === "LOANS" ? loansError : txError) ? (
        // A failed load used to say "No transactions", which is false (§5.4).
        <View style={styles.errorBlock}>
          <MaterialCommunityIcons name="cloud-alert-outline" size={48} color={colors.textSecondary} />
          <Text style={styles.errorTitle}>Couldn't load your activity</Text>
          <Text style={styles.errorSubtitle}>
            {activeTab === "LOANS" ? "Something went wrong. Please try again." : getErrorMessage(txError)}
          </Text>
          <Button label="Try again" variant="secondary" onPress={() => void handleRefresh()} />
        </View>
      ) : sections.length === 0 ? (
        <EmptyState
          title="No transactions"
          subtitle={
            activeTab === "LOANS"
              ? "No active debts or loans recorded."
              : "Transactions you log will appear here."
          }
          icon="receipt-text-outline"
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, { paddingBottom: bottomPadding }]}
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
              onDelete={() => swipeDelete(item)}
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
          if (matching) confirmDeleteLoan(matching);
        }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  errorBlock: { alignItems: "center", gap: spacing.sm, paddingTop: spacing.xl, paddingHorizontal: spacing.lg },
  errorTitle: { ...typography.body, fontWeight: "600", color: colors.textSecondary, textAlign: "center" },
  errorSubtitle: { ...typography.caption, textAlign: "center", marginBottom: spacing.sm },
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
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
    color: colors.textPrimary,
  },
  offlineBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
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
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
  },
  loansOverviewCard: {
    flexDirection: "row",
    backgroundColor: colors.surfaceRaised,
    borderRadius: 22,
    paddingVertical: spacing.md + 2,
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
    fontSize: 11,
    fontWeight: "700",
    color: colors.textMuted,
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  loanColValue: {
    fontSize: 17,
    fontWeight: "700",
  },
  listContent: {
    paddingHorizontal: spacing.lg,
  },
  sectionHeader: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xs + 2,
    backgroundColor: colors.background,
  },
  sectionHeaderText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textMuted,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
});
