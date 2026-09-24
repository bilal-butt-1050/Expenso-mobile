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
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useDashboard } from "../../hooks/useDashboard";
import { useLoans } from "../../hooks/useLoans";
import { useExpenses } from "../../hooks/useExpenses";
import { useAppData } from "../../context/AppDataContext";
import { useAuth } from "../../context/AuthContext";
import { ScreenContainer } from "../../components/ScreenContainer";
import { MonthPicker } from "../../components/MonthPicker";
import { HomeSkeleton } from "../../components/Skeleton";
import { useTabBarPadding } from "../../hooks/useTabBarPadding";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { formatCurrency } from "../../utils/currency";
import { RootStackParamList } from "../../types/navigation";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const bottomPadding = useTabBarPadding();
  const { user } = useAuth();
  const { selectedMonth, setSelectedMonth } = useAppData();
  const { data, isLoading, refetch } = useDashboard();
  const { loans, summary: loansSummary, refresh: refreshLoans } = useLoans();
  const { data: recentExpenses, refetch: refetchExpenses } = useExpenses();

  const handleRefresh = async () => {
    await Promise.all([refetch(), refreshLoans(), refetchExpenses()]);
  };

  // Opens the dedicated Loans screen rather than filtering the Activity feed. Loans are
  // positions, not events — they belong somewhere they can be edited and settled, not as
  // untitled rows in a transaction list.
  const navigateToLoans = () => navigation.navigate("Loans");

  const overdueLoans = (loans ?? []).filter((l) => {
    if (l.status === "SETTLED" || !l.dueDate) return false;
    const due = new Date(l.dueDate).getTime();
    return !isNaN(due) && due < Date.now();
  });

  const [googlePhoto, setGooglePhoto] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (user?.avatarUrl) return;
    (async () => {
      try {
        const currentUser = await GoogleSignin.getCurrentUser();
        if (currentUser?.user?.photo) {
          setGooglePhoto(currentUser.user.photo);
        }
      } catch (e) {
        // Ignore
      }
    })();
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
      {/* Top Header Row */}
      <View style={styles.topRow}>
        <View style={{ flex: 1, marginRight: spacing.md }}>
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
            <Text style={styles.headerAvatarText}>
              {firstName[0].toUpperCase()}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPadding }]}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={handleRefresh}
            tintColor={colors.accent}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {!data ? (
          <HomeSkeleton />
        ) : (
          <>
            {/* HERO SECTION — Calm, Welcoming & Minimal */}
            <View style={styles.heroSection}>
              <Text style={styles.greetingText}>
                {greeting}, {firstName}
              </Text>
              <Text style={styles.heroAmount} numberOfLines={1} adjustsFontSizeToFit>
                {formatCurrency(data.savingsAllTime)}
              </Text>
              <Text style={styles.heroLabel}>Total Balance</Text>

              {data.dailyAllowance != null && data.dailyAllowance > 0 && (
                <View style={styles.allowancePill}>
                  <MaterialCommunityIcons
                    name="shield-check-outline"
                    size={14}
                    color={colors.accent}
                  />
                  <Text style={styles.allowanceText}>
                    {formatCurrency(data.dailyAllowance)}/day safe to spend
                    {data.daysRemaining ? ` • ${data.daysRemaining}d left` : ""}
                  </Text>
                </View>
              )}
            </View>

            {/* QUIET ALERTS (Only shown when action is needed) */}
            {overdueLoans.length > 0 && (
              <View style={styles.alertsContainer}>
                <TouchableOpacity
                  style={[styles.alertCard, styles.alertCardDanger]}
                  onPress={navigateToLoans}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel={`${overdueLoans.length} loans overdue`}
                >
                  <MaterialCommunityIcons
                    name="alert-circle-outline"
                    size={18}
                    color={colors.danger}
                  />
                  <Text style={styles.alertText}>
                    {overdueLoans.length}{" "}
                    {overdueLoans.length === 1 ? "overdue loan requires" : "overdue loans require"}{" "}
                    attention
                  </Text>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={18}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
            )}

            {/* UNIFIED CASHFLOW CARD */}
            <View style={styles.card}>
              <Text style={styles.cardHeaderTitle}>Monthly Cashflow</Text>

              {/* Income vs Spent */}
              <View style={styles.flowRow}>
                <View style={styles.flowItem}>
                  <View style={styles.flowLabelRow}>
                    <MaterialCommunityIcons
                      name="arrow-down-left"
                      size={16}
                      color={colors.success}
                    />
                    <Text style={styles.flowLabel}>Income</Text>
                  </View>
                  <Text style={[styles.flowAmount, { color: colors.success }]}>
                    {formatCurrency(data.monthlyIncome)}
                  </Text>
                </View>

                <View style={styles.flowDivider} />

                <View style={styles.flowItem}>
                  <View style={styles.flowLabelRow}>
                    <MaterialCommunityIcons
                      name="arrow-up-right"
                      size={16}
                      color={colors.textPrimary}
                    />
                    <Text style={styles.flowLabel}>Spent</Text>
                  </View>
                  <Text style={styles.flowAmount}>
                    {formatCurrency(data.totalExpenses)}
                  </Text>
                </View>
              </View>

              {/* Net Savings & Ratio */}
              <View style={styles.savingsRow}>
                <Text style={styles.savingsLabel}>Net Saved</Text>
                <Text style={styles.savingsValue}>
                  {formatCurrency(Math.max(0, data.monthlyIncome - data.totalExpenses))}
                  <Text style={styles.savingsRate}>
                    {" "}({Math.round(data.savingsPercentage * 100)}%)
                  </Text>
                </Text>
              </View>

              {/* Slim Progress Track */}
              <View style={styles.savingsTrack}>
                <View
                  style={[
                    styles.savingsFill,
                    {
                      width: `${Math.min(
                        100,
                        Math.max(0, data.savingsPercentage * 100)
                      )}%`,
                    },
                  ]}
                />
              </View>
            </View>

            {/* NET DEBT POSITION */}
            {loansSummary && (loansSummary.totalLentPending > 0 || loansSummary.totalBorrowedPending > 0) && (
              <TouchableOpacity
                style={styles.card}
                onPress={navigateToLoans}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel="Open debt and loans"
              >
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.cardHeaderTitle}>Debts & Loans</Text>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={18}
                    color={colors.textMuted}
                  />
                </View>

                <View style={styles.flowRow}>
                  <View style={styles.flowItem}>
                    <Text style={styles.debtSubLabel}>Owed to you</Text>
                    <Text style={[styles.flowAmount, { color: colors.success }]}>
                      {formatCurrency(loansSummary.totalLentPending)}
                    </Text>
                  </View>

                  <View style={styles.flowDivider} />

                  <View style={styles.flowItem}>
                    <Text style={styles.debtSubLabel}>You owe</Text>
                    <Text style={[styles.flowAmount, { color: colors.danger }]}>
                      {formatCurrency(loansSummary.totalBorrowedPending)}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}

            {/* RECENT ACTIVITY PREVIEW */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardHeaderTitle}>Recent Activity</Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate("Tabs", { screen: "Activity" })}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.seeAllText}>See All →</Text>
                </TouchableOpacity>
              </View>

              {(!recentExpenses || recentExpenses.length === 0) ? (
                <Text style={styles.emptyRecentText}>No recent activity logged this month</Text>
              ) : (
                <View style={styles.recentList}>
                  {(recentExpenses ?? []).slice(0, 3).map((item, idx: number) => (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.recentRow,
                        idx > 0 && styles.recentRowBorder,
                      ]}
                      activeOpacity={0.7}
                      onPress={() => navigation.navigate("Tabs", { screen: "Activity" })}
                    >
                      <View
                        style={[
                          styles.recentIconBox,
                          {
                            backgroundColor: item.category?.color
                              ? `${item.category.color}1F`
                              : "rgba(99, 102, 241, 0.12)",
                          },
                        ]}
                      >
                        <MaterialCommunityIcons
                          name={(item.category?.icon as any) || "credit-card-outline"}
                          size={18}
                          color={item.category?.color || colors.accent}
                        />
                      </View>
                      <View style={styles.recentInfo}>
                        <Text style={styles.recentTitle} numberOfLines={1}>
                          {item.category?.name || item.description || "Expense"}
                        </Text>
                      </View>
                      <Text style={styles.recentAmount}>
                        -{formatCurrency(item.amount)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </ScreenContainer>
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
  headerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  headerAvatarImage: { width: "100%", height: "100%" },
  headerAvatarText: { fontSize: 17, fontWeight: "700", color: colors.accent },

  scroll: {},

  heroSection: {
    alignItems: "center",
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  greetingText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textSecondary,
    marginBottom: 6,
  },
  heroAmount: {
    fontSize: 48,
    fontWeight: "800",
    color: colors.textPrimary,
    letterSpacing: -1.2,
    marginBottom: 4,
  },
  heroLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.textMuted,
  },

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
  flowItem: {
    flex: 1,
  },
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

  savingsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    marginBottom: 8,
  },
  savingsLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.textMuted,
  },
  savingsValue: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  savingsRate: {
    color: colors.success,
    fontWeight: "700",
  },
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
    color: colors.textMuted,
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
  seeAllText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.accent,
  },
  emptyRecentText: {
    fontSize: 13,
    color: colors.textMuted,
    paddingVertical: spacing.sm,
  },
  recentList: {
    marginTop: -spacing.xs,
  },
  recentRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  recentRowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  recentIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  recentInfo: {
    flex: 1,
    justifyContent: "center",
    paddingRight: spacing.sm,
  },
  recentTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  recentAmount: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
  },
});
