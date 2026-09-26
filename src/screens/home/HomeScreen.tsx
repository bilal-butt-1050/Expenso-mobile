import React, { useState, useEffect } from "react";
import md5 from "md5";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import {
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { onlineManager } from "@tanstack/react-query";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useDashboard } from "../../hooks/useDashboard";
import { useLoans } from "../../hooks/useLoans";
import { useAppData } from "../../context/AppDataContext";
import { useAuth } from "../../context/AuthContext";
import { ScreenContainer } from "../../components/ScreenContainer";
import { MonthPicker } from "../../components/MonthPicker";
import { HomeSkeleton } from "../../components/Skeleton";
import { MoneyText } from "../../components/MoneyText";
import { Button } from "../../components/Button";
import { useSnackbar } from "../../components/snackbar/SnackbarContext";
import { useTabBarPadding } from "../../hooks/useTabBarPadding";
import { colors } from "../../theme/colors";
import { radius, size, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { formatCurrency } from "../../utils/currency";
import { currentMonthKey, formatMonthLabel, formatMonthShort } from "../../utils/date";
import { OFFLINE_MESSAGE, getErrorMessage } from "../../api/client";
import { RootStackParamList } from "../../types/navigation";
import { DashboardSummary } from "../../types/models";

type Nav = NativeStackNavigationProp<RootStackParamList>;

/** Font scale at which two-column figure rows stack (DESIGN NFR-4, rule 2). */
const STACK_AT_FONT_SCALE = 1.3;

/**
 * Home is one month's balance sheet (D-9, DESIGN §S1). Every balance figure is measured at one
 * instant: "today" for the current month, the end of the month for a past one. Everything on the
 * screen is scoped by the month picker, which is why the all-time Recent Activity card left (D-29).
 */
export function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const bottomPadding = useTabBarPadding();
  const { fontScale } = useWindowDimensions();
  const stacked = fontScale >= STACK_AT_FONT_SCALE;
  const { user } = useAuth();
  const { selectedMonth, setSelectedMonth } = useAppData();
  const { data, error, isOffline, refetch } = useDashboard();
  const { loans, refresh: refreshLoans } = useLoans();
  const snackbar = useSnackbar();
  const [refreshing, setRefreshing] = useState(false);

  const isCurrentMonth = selectedMonth === currentMonthKey();

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
      const [dashboard] = await Promise.all([refetch(), refreshLoans()]);
      if (dashboard.isError && data) showRefreshFailed();
    } finally {
      setRefreshing(false);
    }
  };

  // Loans are positions, not events: they're edited and settled on their own screen.
  const navigateToLoans = () => navigation.navigate("Loans");

  // "Overdue" is a fact about today, so it only shows on the current month (DESIGN §S1).
  const overdueLoans = isCurrentMonth
    ? (loans ?? []).filter((l) => {
        if (l.status === "SETTLED" || !l.dueDate) return false;
        const due = new Date(l.dueDate).getTime();
        return !isNaN(due) && due < Date.now();
      })
    : [];

  const [googlePhoto, setGooglePhoto] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (user?.avatarUrl) return;
    let cancelled = false;
    (async () => {
      try {
        const currentUser = await GoogleSignin.getCurrentUser();
        if (!cancelled && currentUser?.user?.photo) {
          setGooglePhoto(currentUser.user.photo);
        }
      } catch {
        // No Google session: fall back to the Gravatar below.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.avatarUrl]);

  const email = user?.email || "";
  const nameFromEmail = email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  const displayName = user?.name || nameFromEmail || "E";
  const firstName = displayName.split(" ")[0];
  const emailHash = md5(email.trim().toLowerCase());
  const fallbackAvatarUrl = `https://www.gravatar.com/avatar/${emailHash}?d=identicon&s=150`;
  const avatarUrl = user?.avatarUrl || googlePhoto || fallbackAvatarUrl;

  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? "Good morning" : currentHour < 17 ? "Good afternoon" : "Good evening";

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
            <Image
              source={{ uri: avatarUrl }}
              style={styles.headerAvatarImage}
              onError={() => setImageError(true)}
            />
          ) : (
            <Text style={styles.headerAvatarText}>{firstName[0].toUpperCase()}</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: bottomPadding }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.accent} />
        }
        showsVerticalScrollIndicator={false}
      >
        {data ? (
          <BalanceSheet
            data={data}
            greeting={`${greeting}, ${firstName}`}
            isCurrentMonth={isCurrentMonth}
            stacked={stacked}
            overdueCount={overdueLoans.length}
            onOpenLoans={navigateToLoans}
          />
        ) : error || isOffline ? (
          <View style={styles.heroSection}>
            <Text style={styles.greetingText}>
              {greeting}, {firstName}
            </Text>
            <View style={styles.errorBlock}>
              <MaterialCommunityIcons name="cloud-alert-outline" size={48} color={colors.textSecondary} />
              <Text style={styles.errorTitle}>Couldn't load your figures</Text>
              <Text style={styles.errorSubtitle}>{error ? getErrorMessage(error) : OFFLINE_MESSAGE}</Text>
              <Button label="Try again" variant="secondary" onPress={() => refetch()} />
            </View>
          </View>
        ) : (
          <HomeSkeleton />
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

interface BalanceSheetProps {
  data: DashboardSummary;
  greeting: string;
  isCurrentMonth: boolean;
  stacked: boolean;
  overdueCount: number;
  onOpenLoans: () => void;
}

function BalanceSheet({ data, greeting, isCurrentMonth, stacked, overdueCount, onOpenLoans }: BalanceSheetProps) {
  const monthName = formatMonthShort(data.month);
  const monthLabel = formatMonthLabel(data.month);

  // Opening → closing continuity. Aug's closing figure and Sep's "Started Sep at" come from the
  // same backend instant, so they are equal by construction.
  const change = Math.round(data.closingNetWorth - data.openingNetWorth);
  const overspent = data.savingsThisMonth < 0;
  const debt = data.netDebtSnapshot;
  const showDebts = debt.totalLent > 0 || debt.totalBorrowed > 0;

  return (
    <>
      <View style={styles.heroSection}>
        <Text style={styles.greetingText}>{greeting}</Text>
        <MoneyText amount={data.closingNetWorth} style={styles.heroAmount} />
        <Text style={styles.heroLabel}>
          {isCurrentMonth ? "Net worth · today" : `Net worth · end of ${monthLabel}`}
        </Text>
        <Text style={styles.openingLine}>
          Started {monthName} at {formatCurrency(data.openingNetWorth)} ·{" "}
          {change === 0 ? (
            "no change"
          ) : (
            <Text style={{ color: change > 0 ? colors.success : colors.danger }}>
              {change > 0 ? "up" : "down"} {formatCurrency(Math.abs(change))}
            </Text>
          )}
        </Text>

        {isCurrentMonth && data.dailyAllowance > 0 && (
          <View style={styles.allowancePill}>
            <MaterialCommunityIcons name="shield-check-outline" size={14} color={colors.accent} />
            <Text style={styles.allowanceText}>
              {formatCurrency(data.dailyAllowance)}/day safe to spend
              {data.daysRemaining ? ` • ${data.daysRemaining}d left` : ""}
            </Text>
          </View>
        )}
      </View>

      {overdueCount > 0 && (
        <View style={styles.alertsContainer}>
          <TouchableOpacity
            style={[styles.alertCard, styles.alertCardDanger]}
            onPress={onOpenLoans}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={`${overdueCount} ${overdueCount === 1 ? "loan" : "loans"} overdue`}
          >
            <MaterialCommunityIcons name="alert-circle-outline" size={18} color={colors.danger} />
            <Text style={styles.alertText}>
              {overdueCount} {overdueCount === 1 ? "overdue loan needs" : "overdue loans need"} attention
            </Text>
            <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardHeaderTitle}>Monthly cashflow</Text>

        <View style={[styles.flowRow, stacked && styles.flowRowStacked]}>
          <View style={styles.flowItem}>
            <View style={styles.flowLabelRow}>
              <MaterialCommunityIcons name="arrow-down-left" size={16} color={colors.success} />
              <Text style={styles.flowLabel}>Income</Text>
            </View>
            <MoneyText amount={data.monthlyIncome} style={[styles.flowAmount, { color: colors.success }]} />
          </View>

          {!stacked && <View style={styles.flowDivider} />}

          <View style={styles.flowItem}>
            <View style={styles.flowLabelRow}>
              <MaterialCommunityIcons name="arrow-up-right" size={16} color={colors.textPrimary} />
              <Text style={styles.flowLabel}>Spent</Text>
            </View>
            <MoneyText amount={data.totalExpenses} style={styles.flowAmount} />
          </View>
        </View>

        <View style={[styles.figureRow, styles.savingsRow, stacked && styles.figureRowStacked]}>
          <Text style={styles.figureLabel}>{overspent ? "Overspent by" : "Net saved"}</Text>
          <MoneyText
            amount={Math.abs(data.savingsThisMonth)}
            style={[styles.figureValue, overspent && { color: colors.danger }]}
          />
        </View>

        <View style={styles.savingsTrack}>
          <View
            style={[
              styles.savingsFill,
              {
                width: `${Math.min(100, Math.max(0, data.spentPercentage ?? 0))}%`,
                backgroundColor: overspent ? colors.danger : colors.accent,
              },
            ]}
          />
        </View>

        <View style={[styles.figureRow, styles.cashRow, stacked && styles.figureRowStacked]}>
          <Text style={styles.figureLabel}>{isCurrentMonth ? "Cash today" : `Cash, end of ${monthName}`}</Text>
          <MoneyText amount={data.closingCash} style={styles.figureValue} />
        </View>
      </View>

      {showDebts && (
        <TouchableOpacity
          style={styles.card}
          onPress={onOpenLoans}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel={isCurrentMonth ? "Debts and loans" : `Debts and loans, end of ${monthName}`}
          accessibilityHint="Opens your loans as of today"
        >
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardHeaderTitle}>
              {isCurrentMonth ? "Debts & loans" : `Debts & loans · end of ${monthName}`}
            </Text>
            <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textMuted} />
          </View>

          <View style={[styles.flowRow, styles.debtRow, stacked && styles.flowRowStacked]}>
            <View style={styles.flowItem}>
              <Text style={styles.debtSubLabel}>Owed to you</Text>
              <MoneyText amount={debt.totalLent} style={[styles.flowAmount, { color: colors.success }]} />
            </View>

            {!stacked && <View style={styles.flowDivider} />}

            <View style={styles.flowItem}>
              <Text style={styles.debtSubLabel}>You owe</Text>
              <MoneyText amount={debt.totalBorrowed} style={[styles.flowAmount, { color: colors.danger }]} />
            </View>
          </View>
        </TouchableOpacity>
      )}
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
  headerAvatarText: { fontSize: 17, fontWeight: "700", color: colors.accent },

  heroSection: {
    alignItems: "center",
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  greetingText: {
    ...typography.small,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textAlign: "center",
  },
  heroAmount: { ...typography.display, textAlign: "center" },
  heroLabel: { ...typography.caption, color: colors.textSecondary, textAlign: "center" },
  openingLine: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: "center",
  },

  errorBlock: { alignItems: "center", gap: spacing.sm, paddingTop: spacing.xl, alignSelf: "stretch" },
  errorTitle: { ...typography.body, fontWeight: "600", color: colors.textSecondary, textAlign: "center" },
  errorSubtitle: { ...typography.caption, textAlign: "center", marginBottom: spacing.sm },

  alertsContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  alertCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: spacing.sm,
  },
  alertCardDanger: {
    borderColor: "rgba(239, 68, 68, 0.25)",
    backgroundColor: "rgba(239, 68, 68, 0.04)",
  },
  alertText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
    color: colors.textPrimary,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  cardHeaderTitle: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  flowRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  flowRowStacked: { flexDirection: "column", alignItems: "stretch", gap: spacing.sm },
  debtRow: { marginBottom: 0 },
  flowItem: { flex: 1 },
  flowLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  flowLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.textSecondary,
  },
  flowAmount: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  flowDivider: {
    width: 1,
    height: 36,
    backgroundColor: colors.borderLight,
    marginHorizontal: spacing.md,
  },

  figureRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  figureRowStacked: { flexDirection: "column", alignItems: "flex-start", gap: 0 },
  savingsRow: {
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    marginBottom: spacing.sm,
  },
  cashRow: { marginTop: spacing.sm },
  figureLabel: { ...typography.small, color: colors.textSecondary, flexShrink: 1 },
  figureValue: { ...typography.small, color: colors.textPrimary },
  savingsTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    overflow: "hidden",
  },
  savingsFill: {
    height: "100%",
    backgroundColor: colors.accent,
    borderRadius: 2,
  },

  debtSubLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.textSecondary,
    marginBottom: 4,
  },
  allowancePill: {
    marginTop: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(99, 102, 241, 0.08)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.2)",
  },
  allowanceText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
  },
});
