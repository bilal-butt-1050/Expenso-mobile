import React, { useMemo, useState } from "react";
import md5 from "md5";
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import Reanimated, { FadeIn } from "react-native-reanimated";
import { useNavigation } from "@react-navigation/native";
import { onlineManager } from "@tanstack/react-query";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useDashboard } from "../../hooks/useDashboard";
import { useAppData } from "../../context/AppDataContext";
import { useAuth } from "../../context/AuthContext";
import { ScreenContainer } from "../../components/ScreenContainer";
import { MonthPicker } from "../../components/MonthPicker";
import { HomeSkeleton } from "../../components/Skeleton";
import { MoneyText } from "../../components/MoneyText";
import { Button } from "../../components/Button";
import { AnimatedProgressBar } from "../../components/AnimatedProgressBar";
import { useSnackbar } from "../../components/snackbar/SnackbarContext";
import { useTabBarPadding } from "../../hooks/useTabBarPadding";
import { colors } from "../../theme/colors";
import { radius, size, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { formatCurrency, formatCurrencySpoken } from "../../utils/currency";
import { formatMonthLabel } from "../../utils/date";
import {
  budgetUsage,
  budgetsNeedingAttention,
  cashShown,
  heroLabel,
  insightFor,
  savedLine,
  spendingSummary,
  unbudgetedSpending,
} from "../../utils/homeText";
import { OFFLINE_MESSAGE, getErrorMessage } from "../../api/client";
import { RootStackParamList } from "../../types/navigation";
import { DashboardSummary } from "../../types/models";

type Nav = NativeStackNavigationProp<RootStackParamList>;

/** Font scale at which two-column figure rows stack (DESIGN NFR-4). */
const STACK_AT_FONT_SCALE = 1.3;

/**
 * Home answers four things (D-62, DESIGN S11): how much can I spend, what happened this month, am I
 * overspending, and is there anything I need to act on. Six sections, in that order, all following
 * the one month picker at the top.
 */
export function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const bottomPadding = useTabBarPadding();
  const { user } = useAuth();
  const { selectedMonth, setSelectedMonth } = useAppData();
  const { data, error, isOffline, refetch } = useDashboard();
  const snackbar = useSnackbar();
  const [refreshing, setRefreshing] = useState(false);

  // Keep the figures already on screen; just say they're not fresh (S-6).
  const showRefreshFailed = () =>
    snackbar.show({
      id: "S-6",
      text: "Couldn't refresh. Showing saved figures.",
      icon: "cloud-alert-outline",
      duration: 4000,
      priority: 3,
    });

  const handleRefresh = async () => {
    // Offline, TanStack pauses a refetch until the network returns instead of failing it, so
    // awaiting it would leave the spinner running indefinitely.
    if (!onlineManager.isOnline()) {
      if (data) showRefreshFailed();
      return;
    }
    setRefreshing(true);
    try {
      const dashboard = await refetch();
      if (dashboard.isError && data) showRefreshFailed();
    } finally {
      setRefreshing(false);
    }
  };

  const [imageError, setImageError] = useState(false);
  const email = user?.email || "";
  const nameFromEmail = email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  const displayName = user?.name || nameFromEmail || "E";
  const firstName = displayName.split(" ")[0];
  const emailHash = md5(email.trim().toLowerCase());
  const fallbackAvatarUrl = `https://www.gravatar.com/avatar/${emailHash}?d=identicon&s=150`;
  // Only this account's own picture (stored by the server for Google accounts) or its Gravatar.
  // Never the phone's Google session, which belongs to whoever last used Google sign-in here.
  const avatarUrl = user?.avatarUrl || fallbackAvatarUrl;

  return (
    <ScreenContainer style={styles.noPad}>
      <View style={styles.topRow}>
        <View style={styles.pickerWrap}>
          <MonthPicker month={selectedMonth} onChange={setSelectedMonth} />
        </View>
        <TouchableOpacity
          style={styles.headerAvatar}
          onPress={() => navigation.navigate("Settings")}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Open settings"
        >
          {avatarUrl && !imageError ? (
            <Image source={{ uri: avatarUrl }} style={styles.headerAvatarImage} onError={() => setImageError(true)} />
          ) : (
            <Text style={styles.headerAvatarText}>{firstName[0].toUpperCase()}</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: bottomPadding }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.accent} />}
        showsVerticalScrollIndicator={false}
      >
        {data ? (
          <Reanimated.View entering={FadeIn.duration(250)}>
            <HomeSections
              data={data}
              onOpenBudget={() => navigation.navigate("Tabs", { screen: "Budget" })}
              onOpenLoans={() => navigation.navigate("Tabs", { screen: "Activity", params: { filter: "LOANS" } })}
            />
          </Reanimated.View>
        ) : error || isOffline ? (
          <View style={styles.errorBlock}>
            <MaterialCommunityIcons name="cloud-alert-outline" size={48} color={colors.textSecondary} />
            <Text style={styles.errorTitle}>Couldn't load your figures</Text>
            <Text style={styles.errorSubtitle}>{error ? getErrorMessage(error) : OFFLINE_MESSAGE}</Text>
            <Button label="Try again" variant="secondary" onPress={() => refetch()} />
          </View>
        ) : (
          <HomeSkeleton />
        )}
      </ScrollView>

    </ScreenContainer>
  );
}

function HomeSections({
  data,
  onOpenBudget,
  onOpenLoans,
}: {
  data: DashboardSummary;
  onOpenBudget: () => void;
  onOpenLoans: () => void;
}) {
  const { fontScale } = useWindowDimensions();
  const stacked = fontScale >= STACK_AT_FONT_SCALE;
  // Every category the insight can name spent something this month, so it's in the breakdown: no
  // second query that could make the card change once it loads.
  const categoryName = useMemo(() => {
    const names = new Map(data.categoryBreakdown.map((c) => [c.categoryId, c.name]));
    return (id: string) => names.get(id);
  }, [data.categoryBreakdown]);

  const cash = data.cashAvailable;
  const label = heroLabel(cash.period, data.month);
  const saved = savedLine(data.monthlyIncome, data.totalExpenses, cash.period);
  const spending = spendingSummary(data.categoryBreakdown);
  const attention = budgetsNeedingAttention(data.budgetVsActual);
  const unbudgeted = unbudgetedSpending(data.categoryBreakdown, data.budgetVsActual);
  const shown = cashShown(cash.amount);
  const hasBudgets = data.budgetVsActual.some((b) => b.budget > 0);
  const insight = insightFor(data.comparison, cash.period, data.month, categoryName);
  const owed = data.netDebtSnapshot;
  const monthLabel = formatMonthLabel(data.month);

  return (
    <>
      {/* 1. Cash available: the one hero figure, centred, never below zero (R-35, D-64) */}
      <View
        style={styles.hero}
        accessible
        accessibilityLabel={`${label}, ${formatCurrencySpoken(shown.amount)}${shown.incomplete ? ". Some income or a loan may be missing" : ""}`}
      >
        <Text style={styles.heroLabel}>{label}</Text>
        <MoneyText amount={shown.amount} style={styles.heroAmount} />
        {shown.incomplete ? <Text style={styles.heroNote}>Some income or a loan may be missing</Text> : null}
      </View>

      {/* 2. What happened this month (R-36) */}
      <View style={styles.card}>
        <View style={[styles.twoCol, stacked && styles.twoColStacked]}>
          <View style={styles.col} accessible accessibilityLabel={`Income, ${formatCurrencySpoken(data.monthlyIncome)}`}>
            <Text style={styles.figureLabel}>Income</Text>
            <MoneyText amount={data.monthlyIncome} style={styles.figure} />
          </View>
          <View style={styles.col} accessible accessibilityLabel={`Expenses, ${formatCurrencySpoken(data.totalExpenses)}`}>
            <Text style={styles.figureLabel}>Expenses</Text>
            <MoneyText amount={data.totalExpenses} style={styles.figure} />
          </View>
        </View>
        {saved ? (
          <View style={styles.savedRow} accessible accessibilityLabel={`${saved.label}, ${formatCurrencySpoken(saved.amount)}`}>
            <Text style={[styles.savedLabel, saved.overspent && styles.negative]}>{saved.label}</Text>
            <MoneyText amount={saved.amount} style={[styles.savedValue, saved.overspent && styles.negative]} />
          </View>
        ) : (
          <Text style={styles.muted}>Nothing yet</Text>
        )}
      </View>

      {/* 3. Where it went (R-37) */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Spending</Text>
          <Pressable onPress={onOpenBudget} style={styles.link} accessibilityRole="button" accessibilityLabel="View all spending">
            <Text style={styles.linkText}>View all ›</Text>
          </Pressable>
        </View>
        {spending.top.length === 0 ? (
          <Text style={styles.muted}>Nothing spent in {monthLabel} yet</Text>
        ) : (
          <>
            {spending.top.map((c) => (
              <View key={c.categoryId} style={styles.spendRow} accessible accessibilityLabel={`${c.name}, ${formatCurrencySpoken(c.amount)}`}>
                <View style={[styles.spendHead, stacked && styles.twoColStacked]}>
                  <Text style={styles.spendName} numberOfLines={1}>{c.name}</Text>
                  <MoneyText amount={c.amount} style={styles.spendAmount} />
                </View>
                <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
                  <AnimatedProgressBar progress={spending.max > 0 ? c.amount / spending.max : 0} height={4} color={colors.accent} />
                </View>
              </View>
            ))}
            {spending.restCount > 0 ? (
              <View style={styles.spendHead} accessible accessibilityLabel={`${spending.restCount} more, ${formatCurrencySpoken(spending.restTotal)}`}>
                <Text style={styles.muted}>+ {spending.restCount} more</Text>
                <MoneyText amount={spending.restTotal} style={styles.spendAmount} />
              </View>
            ) : null}
          </>
        )}
      </View>

      {/* 4. Budgets that need attention (R-38) */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Budgets</Text>
        {!hasBudgets && unbudgeted.length === 0 ? (
          <Pressable onPress={onOpenBudget} style={styles.link} accessibilityRole="button">
            <Text style={styles.muted}>No budgets for {monthLabel} · <Text style={styles.linkText}>Set one ›</Text></Text>
          </Pressable>
        ) : attention.length === 0 && unbudgeted.length === 0 ? (
          <View style={styles.onTrack}>
            <MaterialCommunityIcons name="check-circle-outline" size={18} color={colors.success} accessibilityElementsHidden importantForAccessibility="no" />
            <Text style={styles.onTrackText}>All budgets are on track</Text>
          </View>
        ) : (
          attention.map((b) => {
            const over = b.actual > b.budget;
            const status = over ? `Over by ${formatCurrency(b.actual - b.budget)}` : `${Math.round(budgetUsage(b) * 100)}%`;
            return (
              <View key={b.categoryId} style={styles.budgetRow} accessible accessibilityLabel={`${b.name}, ${formatCurrencySpoken(b.actual)} of ${formatCurrencySpoken(b.budget)}, ${status}`}>
                <View style={[styles.spendHead, stacked && styles.twoColStacked]}>
                  <Text style={styles.spendName} numberOfLines={1}>{b.name}</Text>
                  <View style={styles.figurePair}>
                    <MoneyText amount={b.actual} style={styles.budgetFigures} />
                    <Text style={styles.budgetFigures}> / </Text>
                    <MoneyText amount={b.budget} style={styles.budgetFigures} />
                  </View>
                </View>
                <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
                  <AnimatedProgressBar progress={budgetUsage(b)} height={6} autoColor />
                </View>
                <Text style={[styles.budgetStatus, over && styles.negative]}>{status}</Text>
              </View>
            );
          })
        )}
        {/* Money going out where no budget watches it (D-64). */}
        {unbudgeted.slice(0, 3).map((c) => (
          <Pressable
            key={c.categoryId}
            onPress={onOpenBudget}
            style={[styles.spendHead, styles.unbudgetedRow, stacked && styles.twoColStacked]}
            accessibilityRole="button"
            accessibilityLabel={`${c.name}, ${formatCurrencySpoken(c.amount)} spent with no budget`}
            accessibilityHint="Opens Budget to set one"
          >
            <Text style={styles.spendName} numberOfLines={1}>{c.name}</Text>
            <View style={styles.figurePair}>
              <MoneyText amount={c.amount} style={styles.budgetFigures} />
              <Text style={styles.budgetFigures}> · no budget</Text>
            </View>
          </Pressable>
        ))}
        {unbudgeted.length > 3 ? <Text style={styles.muted}>+ {unbudgeted.length - 3} more without a budget</Text> : null}
      </View>

      {/* 5. One observation, only when it's meaningful (R-39) */}
      {insight ? (
        <View style={[styles.card, styles.insight]}>
          <MaterialCommunityIcons name="lightbulb-on-outline" size={20} color={colors.warning} accessibilityElementsHidden importantForAccessibility="no" />
          <Text style={styles.insightText}>{insight}</Text>
        </View>
      ) : null}

      {/* 6. Money owed, small (R-40) */}
      {owed.totalLent > 0 || owed.totalBorrowed > 0 ? (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Money owed</Text>
            <Pressable onPress={onOpenLoans} style={styles.link} accessibilityRole="button" accessibilityLabel="View loan details">
              <Text style={styles.linkText}>View details ›</Text>
            </Pressable>
          </View>
          {owed.totalLent > 0 ? (
            <View style={[styles.spendHead, stacked && styles.twoColStacked]} accessible accessibilityLabel={`Still to come back, ${formatCurrencySpoken(owed.totalLent)}`}>
              <Text style={styles.spendName}>Still to come back</Text>
              <MoneyText amount={owed.totalLent} style={styles.spendAmount} />
            </View>
          ) : null}
          {owed.totalBorrowed > 0 ? (
            <View style={[styles.spendHead, stacked && styles.twoColStacked]} accessible accessibilityLabel={`Still to pay back, ${formatCurrencySpoken(owed.totalBorrowed)}`}>
              <Text style={styles.spendName}>Still to pay back</Text>
              <MoneyText amount={owed.totalBorrowed} style={styles.spendAmount} />
            </View>
          ) : null}
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  noPad: { paddingHorizontal: 0 },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.background,
    zIndex: 10,
  },
  pickerWrap: { flex: 1, marginRight: spacing.md },
  headerAvatar: {
    width: size.minTouch,
    height: size.minTouch,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  headerAvatarImage: { width: "100%", height: "100%" },
  headerAvatarText: { ...typography.body, fontWeight: "700", color: colors.accent },

  hero: { alignItems: "center", paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.md, gap: spacing.xs },
  heroLabel: { ...typography.caption, color: colors.textSecondary, textAlign: "center" },
  heroAmount: { ...typography.metricValue, textAlign: "center" },
  heroNote: { ...typography.small, color: colors.warning, textAlign: "center" },
  negative: { color: colors.danger },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: spacing.sm,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardTitle: { ...typography.body, fontWeight: "700", color: colors.textPrimary },
  link: { minHeight: size.minTouch, justifyContent: "center" },
  linkText: { ...typography.small, color: colors.accent },
  muted: { ...typography.caption, color: colors.textSecondary },

  twoCol: { flexDirection: "row", gap: spacing.md },
  twoColStacked: { flexDirection: "column", alignItems: "flex-start", gap: spacing.xs },
  col: { flex: 1 },
  figureLabel: { ...typography.small, color: colors.textSecondary },
  figure: { ...typography.subtitle, color: colors.textPrimary, fontWeight: "700" },
  savedRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  savedLabel: { ...typography.body, color: colors.textSecondary },
  savedValue: { ...typography.body, fontWeight: "700", color: colors.success },

  spendRow: { gap: spacing.xs },
  spendHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.md },
  spendName: { ...typography.body, color: colors.textPrimary, flexShrink: 1 },
  spendAmount: { ...typography.body, color: colors.textPrimary, fontWeight: "600" },

  budgetRow: { gap: spacing.xs, paddingVertical: spacing.xs },
  budgetFigures: { ...typography.small, color: colors.textSecondary },
  // A figure with its neighbouring text, each money value still compacting on its own (W8).
  // Wraps at large text instead of running past the card's edge (NFR-4, G4 M2).
  figurePair: { flexDirection: "row", flexWrap: "wrap", alignItems: "baseline" },
  budgetStatus: { ...typography.small, color: colors.textSecondary },
  unbudgetedRow: { minHeight: size.minTouch },
  onTrack: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  onTrackText: { ...typography.caption, color: colors.textPrimary },

  insight: { flexDirection: "row", alignItems: "flex-start" },
  insightText: { ...typography.body, color: colors.textPrimary, flexShrink: 1 },

  errorBlock: { alignItems: "center", gap: spacing.sm, paddingTop: spacing.xl, paddingHorizontal: spacing.lg },
  errorTitle: { ...typography.body, fontWeight: "600", color: colors.textSecondary, textAlign: "center" },
  errorSubtitle: { ...typography.caption, textAlign: "center", marginBottom: spacing.sm },
});
