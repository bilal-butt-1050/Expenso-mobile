import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  RefreshControl,
  LayoutAnimation,
  ActivityIndicator,
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
import { Loan, Transaction, TransactionKind } from "../../types/models";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type ActivityTab = "ALL" | "EXPENSES" | "INCOME" | "LOANS";

/** Which ledger kinds each segment shows. Loans are positions and come from the loan list. */
const KINDS_FOR_TAB: Record<ActivityTab, TransactionKind[] | undefined> = {
  ALL: undefined,
  EXPENSES: ["SPEND"],
  INCOME: ["EARN"],
  LOANS: [],
};

/** A loan movement says what happened, not which category it's in (R-30). */
const MOVEMENT_TITLE: Partial<Record<TransactionKind, string>> = {
  LEND_OUT: "You lent",
  BORROW_IN: "You borrowed",
  COLLECT: "Paid back to you",
  REPAY: "You paid back",
};
const MOVEMENT_ICON: Partial<Record<TransactionKind, string>> = {
  LEND_OUT: "arrow-top-right",
  BORROW_IN: "arrow-bottom-left",
  COLLECT: "arrow-bottom-left",
  REPAY: "arrow-top-right",
};
/** The server writes "Lent to Ali", "Repayment from Ali", ...: the name, if the loan isn't loaded. */
const personFromDescription = (description: string | null) =>
  description?.replace(/^(Lent to|Borrowed from|Repayment from|Repayment to)\s+/, "") || undefined;

/**
 * How a kind's amount is signed (R-28). A switch rather than "not SPEND means income", so a kind
 * added later (the parked balance corrections) fails to compile here instead of showing as income.
 */
function toneOf(kind: TransactionKind): UnifiedActivityItem["tone"] {
  switch (kind) {
    case "SPEND":
      return "out";
    case "EARN":
      return "in";
    case "LEND_OUT":
    case "COLLECT":
    case "BORROW_IN":
    case "REPAY":
      return "neutral";
    default: {
      const unhandled: never = kind;
      return unhandled;
    }
  }
}

/** Due before today is overdue; due today isn't yet. */
function isOverdue(loan: Loan): boolean {
  if (loan.status === "SETTLED" || !loan.dueDate) return false;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const due = new Date(loan.dueDate).getTime();
  return !isNaN(due) && due < startOfToday.getTime();
}

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

  // The record a form just saved, highlighted once. Held here and cleared from the route, or it
  // would re-highlight every time the rows remount (switching segments).
  const [highlightId, setHighlightId] = useState<string | undefined>(undefined);
  // A ref, not the effect's cleanup: clearing the param re-runs the effect, and a cleanup there
  // would cancel the timer, leaving the highlight on for good.
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const incoming = route.params?.highlightId;
    if (!incoming) return;
    setHighlightId(incoming);
    navigation.setParams({ highlightId: undefined });
    if (highlightTimer.current) clearTimeout(highlightTimer.current);
    highlightTimer.current = setTimeout(() => setHighlightId(undefined), 3000);
  }, [route.params?.highlightId, navigation]);
  useEffect(
    () => () => {
      if (highlightTimer.current) clearTimeout(highlightTimer.current);
    },
    []
  );

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
    hasMore,
    isFetchingMore,
    refetch: refetchTransactions,
    loadMore,
  } = useTransactions({ kinds });
  // The pull-to-refresh spinner shows a refresh the user asked for, not the first load.
  const [refreshing, setRefreshing] = useState(false);
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
    setRefreshing(true);
    try {
      await Promise.all([refetchTransactions(), refetchLoans()]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchTransactions, refetchLoans]);

  /**
   * Maps the ledger onto rows. Income and spending are titled by their source or category; a loan
   * movement by what happened ("You lent", "Paid back to you"), with the person underneath (R-30).
   */
  const loansById = useMemo(() => new Map((loans || []).map((l) => [l.id, l])), [loans]);

  const unifiedItems = useMemo<UnifiedActivityItem[]>(() => {
    if (activeTab === "LOANS") {
      // Newest first, so the date headers read in order (the server lists active loans first).
      const byNewest = [...(loans || [])].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      return byNewest.filter((loan) => !hiddenIds.has(`loan-${loan.id}`)).map((loan) => {
        const isLent = loan.type === "LENT";
        const status = loan.status === "SETTLED" ? "settled" : isOverdue(loan) ? "overdue" : "open";
        // The due date was on the old Loans screen; without it, "Overdue" is the first warning.
        const due = status !== "settled" && loan.dueDate ? ` · due ${formatDate(loan.dueDate)}` : "";
        return {
          id: `loan-${loan.id}`,
          rawId: loan.id,
          type: "LOAN" as const,
          // What happened, then who with (R-29). The person is the identity of the record.
          title: isLent ? "You lent" : "You borrowed",
          subtitle: loan.personName,
          amount: loan.amount,
          date: loan.createdAt,
          icon: isLent ? "arrow-top-right" : "arrow-bottom-left",
          tone: "neutral" as const,
          loanDirection: loan.type,
          repayment: {
            paid: loan.settledAmount,
            total: loan.amount,
            label: `${formatCurrency(loan.settledAmount)} of ${formatCurrency(loan.amount)} ${isLent ? "paid back" : "repaid"}${due}`,
            status,
          },
          raw: loan,
        };
      });
    }

    // Already ordered by the server on (date desc, id desc).
    // A loan waiting out its undo window takes its movements with it.
    const visible = (transactions || []).filter(
      (tx) => !hiddenIds.has(tx.id) && !(tx.loanId && hiddenIds.has(`loan-${tx.loanId}`))
    );
    return visible.map((tx): UnifiedActivityItem => {
      const tone = toneOf(tx.kind);
      if (tone === "neutral") {
        const loan = tx.loanId ? loansById.get(tx.loanId) : undefined;
        return {
          id: tx.id,
          rawId: tx.id,
          type: "LOAN_MOVEMENT",
          title: MOVEMENT_TITLE[tx.kind] ?? "Loan",
          subtitle: loan?.personName ?? personFromDescription(tx.description),
          amount: tx.amount,
          date: tx.date,
          icon: MOVEMENT_ICON[tx.kind] ?? "swap-horizontal",
          // Not income or spending: no sign (R-28, R-30).
          tone: "neutral",
          loanDirection: loan?.type ?? (tx.kind === "LEND_OUT" || tx.kind === "COLLECT" ? "LENT" : "BORROWED"),
          raw: tx,
        };
      }

      const isSpend = tx.kind === "SPEND";
      return {
        id: tx.id,
        rawId: tx.id,
        type: isSpend ? "EXPENSE" : "INCOME",
        title: isSpend ? tx.category?.name || tx.description || "Expense" : tx.source || tx.description || "Income",
        subtitle: isSpend
          ? tx.category?.name
            ? tx.description || undefined
            : undefined
          : tx.source
            ? tx.description || undefined
            : undefined,
        amount: tx.amount,
        date: tx.date,
        icon: isSpend ? tx.category?.icon || "credit-card-outline" : tx.sourceIcon || "wallet-plus-outline",
        tone,
        raw: tx,
      };
    });
  }, [transactions, loans, loansById, activeTab, hiddenIds]);

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
      const loan = loansById.get(tx.loanId);
      // Loans live in the Loans segment now; there's no separate Loans screen (R-29).
      if (loan) setSettlingLoan(loan);
      else setActiveTab("LOANS");
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
  const confirmDeleteLoan = (loan: Loan) => {
    confirm({
      title: "Delete loan?",
      message: `${loan.personName} · ${formatCurrency(loan.amount)}. Any payments recorded against it go too.`,
      destructive: true,
      confirmText: "Delete",
      onConfirm: async () => {
        hapticDelete();
        setDeletingId(`loan-${loan.id}`);
        try {
          await removeLoan(loan.id);
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
    // A swiped loan gets the same undo as income and expenses (D-58). Its payments go with it,
    // which is why the sheet's explicit Delete button still asks first.
    if (item.type === "LOAN") {
      const loan = item.raw as Loan;
      hapticDelete();
      animateLayout();
      setHidden(item.id, true);
      snackbar.show({
        id: `S-1-${item.id}`,
        text: `Deleted the loan with ${loan.personName} · ${formatCurrency(loan.amount)}`,
        action: {
          label: "Undo",
          a11yLabel: `Undo deleting the loan with ${loan.personName}`,
          onPress: () => {
            animateLayout();
            setHidden(item.id, false);
          },
        },
        duration: 5000,
        priority: 1,
        onExpire: () => {
          if (committedIds.current.has(item.id)) return;
          committedIds.current.add(item.id);
          removeLoan(loan.id)
            .catch((err) => alert({ title: "Couldn't delete the loan", message: getErrorMessage(err) }))
            .finally(() => setHidden(item.id, false));
        },
      });
      return;
    }

    const tx = item.raw as Transaction;
    // A loan's movements belong to the loan; deleting one here would desynchronise its balance.
    if (tx.loanId) {
      const loan = loansById.get(tx.loanId);
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
        // Either way the hide ends: on success the row is already out of the cache; on failure the
        // defaults refetch it and show "Couldn't delete". Offline, this waits for the replay.
        commitDelete(tx.id, item.title)
          .catch(() => {})
          .finally(() => setHidden(tx.id, false));
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
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.accent}
            />
          }
          // The feed is paged (30 per page). Without this, rows past the first page of a month were
          // never loaded, so older transactions silently didn't appear.
          onEndReached={activeTab !== "LOANS" && hasMore ? loadMore : undefined}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isFetchingMore ? <ActivityIndicator color={colors.accent} style={styles.pageSpinner} /> : null
          }
          ListHeaderComponent={
            activeTab === "LOANS" && loansSummary ? (
              <View style={styles.loansOverviewCard}>
                <View style={styles.loanCol}>
                  {/* The figure is what's still out, and the title says exactly that (§5.4). */}
                  <Text style={styles.loanColLabel}>STILL TO COME BACK</Text>
                  <Text style={[styles.loanColValue, { color: colors.success }]}>
                    {formatCurrency(loansSummary.totalLentPending)}
                  </Text>
                </View>
                <View style={styles.loanDivider} />
                <View style={styles.loanCol}>
                  <Text style={styles.loanColLabel}>STILL TO PAY BACK</Text>
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
          const loan = loansById.get(loanId);
          if (loan) confirmDeleteLoan(loan);
        }}
        onEdit={(loan) => navigation.navigate("LoanForm", { loan })}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  pageSpinner: { paddingVertical: spacing.lg },
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
