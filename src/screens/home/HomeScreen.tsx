import React, { useState, useEffect } from "react";
import md5 from "md5";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { Image, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useDashboard } from "../../hooks/useDashboard";
import { useLoans } from "../../hooks/useLoans";
import { useAppData } from "../../context/AppDataContext";
import { useAuth } from "../../context/AuthContext";
import { ScreenContainer } from "../../components/ScreenContainer";
import { MonthPicker } from "../../components/MonthPicker";
import { HomeSkeleton } from "../../components/Skeleton";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { formatCurrency } from "../../utils/currency";
import { RootStackParamList } from "../../types/navigation";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const { selectedMonth, setSelectedMonth } = useAppData();
  const { data, isLoading, refetch } = useDashboard();
  const { loans, summary: loansSummary, refresh: refreshLoans } = useLoans();

  const handleRefresh = async () => {
    await Promise.all([refetch(), refreshLoans()]);
  };

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
  const nameFromEmail = email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, l => l.toUpperCase());
  const displayName = user?.name || nameFromEmail || "E";
  const emailHash = md5(email.trim().toLowerCase());
  const fallbackAvatarUrl = `https://www.gravatar.com/avatar/${emailHash}?d=identicon&s=150`;
  const avatarUrl = user?.avatarUrl || googlePhoto || fallbackAvatarUrl;

  return (
    <ScreenContainer style={styles.noPad}>
      {/* Top Header Row — Fixed at top */}
      <View style={styles.topRow}>
        <View style={{ flex: 1, marginRight: spacing.md }}>
          <MonthPicker month={selectedMonth} onChange={setSelectedMonth} />
        </View>
        <TouchableOpacity
          style={styles.headerAvatar}
          onPress={() => navigation.navigate("Settings" as any)}
          activeOpacity={0.8}
          accessibilityRole="button"
        >
          {avatarUrl && !imageError ? (
            <Image
              source={{ uri: avatarUrl }}
              style={styles.headerAvatarImage}
              onError={() => setImageError(true)}
            />
          ) : (
            <Text style={styles.headerAvatarText}>
              {displayName[0].toUpperCase()}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={handleRefresh} tintColor={colors.accent} />}
        showsVerticalScrollIndicator={false}
      >
        {!data ? (
          <HomeSkeleton />
        ) : (
          <>
            {/* HERO SECTION — Clean, Typographic Focus */}
            <View style={styles.heroSection}>
              <Text style={styles.heroLabel}>AVAILABLE BALANCE</Text>
              <Text style={styles.heroAmount} numberOfLines={1} adjustsFontSizeToFit>
                {formatCurrency(data.savingsAllTime)}
              </Text>
            </View>

            {/* QUICK ACTIONS — Floating Pills */}
            <View style={styles.quickActionsWrap}>
              <TouchableOpacity style={styles.actionPill} activeOpacity={0.7} onPress={() => navigation.navigate("IncomeForm" as any)}>
                <MaterialCommunityIcons name="plus" size={18} color={colors.success} />
                <Text style={styles.actionPillText} numberOfLines={1}>Income</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionPill} activeOpacity={0.7} onPress={() => navigation.navigate("ExpenseForm" as any)}>
                <MaterialCommunityIcons name="plus" size={18} color={colors.danger} />
                <Text style={styles.actionPillText} numberOfLines={1}>Expense</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionPill} activeOpacity={0.7} onPress={() => navigation.navigate("Tabs", { screen: "Budget" } as any)}>
                <MaterialCommunityIcons name="chart-donut" size={18} color={colors.accent} />
                <Text style={styles.actionPillText} numberOfLines={1}>Budgets</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionPill} activeOpacity={0.7} onPress={() => navigation.navigate("Loans" as any)}>
                <MaterialCommunityIcons name="hand-coin-outline" size={18} color={colors.warning} />
                <Text style={styles.actionPillText} numberOfLines={1}>Loans</Text>
              </TouchableOpacity>
            </View>

            {/* ACTION CENTER — Horizontally Scrolling Global Reminders */}
            {(data.unpaidExpenses > 0 || overdueLoans.length > 0 || (data.dailyAllowance ?? 0) > 0 || (data.daysRemaining ?? 0) > 0) && (
              <View style={styles.sectionWrap}>
                <Text style={styles.sectionTitle}>Action Center</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.actionCenterScroll}>
                  {overdueLoans.length > 0 && (
                    <ActionChip
                      icon="alert-octagon-outline"
                      color={colors.danger}
                      label="Overdue Debt"
                      value={`${overdueLoans.length} ${overdueLoans.length === 1 ? "loan" : "loans"}`}
                      onPress={() => navigation.navigate("Loans" as any)}
                    />
                  )}
                  {data.unpaidExpenses > 0 && (
                    <ActionChip
                      icon="clock-alert-outline"
                      color={colors.warning}
                      label="Total Unpaid Bills"
                      value={formatCurrency(data.unpaidExpenses)}
                      onPress={() => navigation.navigate("Tabs", { screen: "Activity" } as any)}
                    />
                  )}
                  {(data.dailyAllowance ?? 0) > 0 && (
                    <ActionChip
                      icon="calendar-check-outline"
                      color={colors.accent}
                      label="Daily Safe Spend"
                      value={formatCurrency(data.dailyAllowance!)}
                    />
                  )}
                  {(data.daysRemaining ?? 0) > 0 && (
                    <ActionChip
                      icon="timer-sand"
                      color={colors.textSecondary}
                      label="Days Left"
                      value={`${data.daysRemaining} days`}
                    />
                  )}
                </ScrollView>
              </View>
            )}

            {/* INSIGHTS MESH — Asymmetric Grid */}
            <View style={styles.sectionWrap}>
              <Text style={styles.sectionTitle}>Monthly Snapshot</Text>
              
              <View style={styles.meshGrid}>
                {/* Row 1: Split 50/50 */}
                <View style={styles.meshRow}>
                  <View style={[styles.meshBlock, { flex: 1, backgroundColor: colors.surface }]}>
                    <MaterialCommunityIcons name="cash-multiple" size={22} color={colors.success} />
                    <Text style={styles.meshLabel}>Received</Text>
                    <Text style={styles.meshValue}>{formatCurrency(data.monthlyIncome)}</Text>
                  </View>
                  <View style={[styles.meshBlock, { flex: 1, backgroundColor: colors.surface }]}>
                    <MaterialCommunityIcons name="cart-outline" size={22} color={colors.danger} />
                    <Text style={styles.meshLabel}>Spent</Text>
                    <Text style={styles.meshValue}>{formatCurrency(data.paidExpenses)}</Text>
                  </View>
                </View>

                {/* Row 2: Full Width Savings Rate */}
                <View style={[styles.meshBlock, { backgroundColor: colors.surface, flexDirection: "row", alignItems: "center" }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.meshLabel}>Saved This Month</Text>
                    <View style={{ flexDirection: "row", alignItems: "baseline", gap: spacing.sm }}>
                      <Text style={styles.meshValue}>
                        {formatCurrency(Math.max(0, data.monthlyIncome - data.paidExpenses))}
                      </Text>
                      {data.plannedSavings > 0 && (
                        <Text style={{ fontSize: 14, color: colors.textSecondary, fontWeight: "600", marginLeft: -4 }}>
                          / {formatCurrency(data.plannedSavings)}
                        </Text>
                      )}
                      <Text style={{ fontSize: 18, color: colors.success, fontWeight: "700" }}>
                        ({Math.round(data.savingsPercentage * 100)}%)
                      </Text>
                    </View>
                  </View>
                  <MaterialCommunityIcons name="piggy-bank-outline" size={32} color={colors.accent} />
                </View>

                {/* Row 3: Split Pacing & Split */}
                <View style={styles.meshRow}>
                  <View style={[styles.meshBlock, { flex: 1, backgroundColor: colors.surface }]}>
                    <Text style={styles.meshLabel}>Pacing</Text>
                    <View style={styles.pacingPill}>
                      <View style={[styles.pacingDot, { 
                        backgroundColor: data.pacingStatus === "On Track" ? colors.success : data.pacingStatus === "Pacing Fast" ? colors.warning : colors.danger 
                      }]} />
                      <Text style={[styles.pacingText, {
                        color: data.pacingStatus === "On Track" ? colors.success : data.pacingStatus === "Pacing Fast" ? colors.warning : colors.danger
                      }]}>
                        {data.pacingStatus}
                      </Text>
                    </View>
                  </View>
                  
                  {data.needsPercentage !== undefined && data.wantsPercentage !== undefined && data.totalExpenses > 0 && (
                    <View style={[styles.meshBlock, { flex: 1.2, backgroundColor: colors.surface }]}>
                      <Text style={styles.meshLabel}>Needs / Wants</Text>
                      <View style={styles.splitTrack}>
                        <View style={[styles.splitFill, { width: `${data.needsPercentage}%`, backgroundColor: colors.accent }]} />
                        <View style={[styles.splitFill, { width: `${data.wantsPercentage}%`, backgroundColor: colors.warning }]} />
                      </View>
                      <Text style={styles.splitText}>{Math.round(data.needsPercentage)}% / {Math.round(data.wantsPercentage)}%</Text>
                    </View>
                  )}
                </View>

              </View>
            </View>

            {/* NET DEBT POSITION */}
            {loansSummary && (loansSummary.totalLentPending > 0 || loansSummary.totalBorrowedPending > 0) && (
              <View style={styles.sectionWrap}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>Net Debt Position</Text>
                  <TouchableOpacity
                    onPress={() => navigation.navigate("Loans" as any)}
                    activeOpacity={0.7}
                    style={{ paddingRight: spacing.lg }}
                  >
                    <Text style={styles.sectionActionText}>View all</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.debtCard}
                  onPress={() => navigation.navigate("Loans" as any)}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="Net Debt Position"
                >
                  <View style={styles.debtCardRow}>
                    <View style={styles.debtCardCol}>
                      <View style={styles.debtBadgeRow}>
                        <MaterialCommunityIcons name="arrow-down-left" size={16} color={colors.success} />
                        <Text style={styles.debtColLabel}>OWED TO YOU</Text>
                      </View>
                      <Text style={[styles.debtColValue, { color: colors.success }]}>
                        {formatCurrency(loansSummary.totalLentPending)}
                      </Text>
                    </View>

                    <View style={styles.debtDivider} />

                    <View style={styles.debtCardCol}>
                      <View style={styles.debtBadgeRow}>
                        <MaterialCommunityIcons name="arrow-up-right" size={16} color={colors.danger} />
                        <Text style={styles.debtColLabel}>YOU OWE</Text>
                      </View>
                      <Text style={[styles.debtColValue, { color: colors.danger }]}>
                        {formatCurrency(loansSummary.totalBorrowedPending)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.debtNetFooter}>
                    <Text style={styles.debtNetLabel}>Net Balance Position</Text>
                    <Text
                      style={[
                        styles.debtNetValue,
                        {
                          color:
                            loansSummary.netBalance > 0
                              ? colors.success
                              : loansSummary.netBalance < 0
                              ? colors.danger
                              : colors.textSecondary,
                        },
                      ]}
                    >
                      {loansSummary.netBalance > 0 ? "+" : ""}
                      {formatCurrency(loansSummary.netBalance)}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}

          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

function ActionChip({
  icon,
  label,
  value,
  color,
  onPress,
}: {
  icon: any;
  label: string;
  value: string;
  color: string;
  onPress?: () => void;
}) {
  const content = (
    <View style={styles.actionChip}>
      <View style={[styles.chipIconWrap, { backgroundColor: `${color}1A` }]}>
        <MaterialCommunityIcons name={icon} size={20} color={color} />
      </View>
      <View>
        <Text style={styles.chipValue}>{value}</Text>
        <Text style={styles.chipLabel}>{label}</Text>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
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
    backgroundColor: colors.background, // sticky illusion
    zIndex: 10,
  },
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  headerAvatarImage: { width: "100%", height: "100%" },
  headerAvatarText: { fontSize: 18, fontWeight: "700", color: colors.accent },
  
  scroll: {
    paddingBottom: spacing.xxl + 80,
  },

  heroSection: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  heroLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textSecondary,
    letterSpacing: 1.5,
    marginBottom: spacing.xs,
  },
  heroAmount: {
    fontSize: 52,
    fontWeight: "800",
    color: colors.textPrimary,
    letterSpacing: -1.5,
    marginBottom: spacing.md,
  },
  savingsPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  savingsPillText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
  },

  quickActionsWrap: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xl,
  },
  actionPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: colors.surfaceRaised,
    paddingVertical: 12,
    paddingHorizontal: 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textPrimary,
  },

  sectionWrap: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },

  actionCenterScroll: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  actionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    paddingRight: spacing.lg,
    paddingLeft: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  chipValue: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  chipLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.textMuted,
  },

  meshGrid: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  meshRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  meshBlock: {
    borderRadius: 24,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  meshLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textMuted,
    marginTop: spacing.xs,
    marginBottom: 4,
  },
  meshValue: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.textPrimary,
  },

  pacingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  pacingDot: { width: 8, height: 8, borderRadius: 4 },
  pacingText: { fontSize: 14, fontWeight: "700" },

  splitTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surfaceRaised,
    flexDirection: "row",
    overflow: "hidden",
    marginTop: 6,
    marginBottom: 8,
  },
  splitFill: { height: "100%" },
  splitText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  sectionActionText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.accent,
  },
  debtCard: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.lg,
  },
  debtCardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  debtCardCol: {
    flex: 1,
  },
  debtBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: spacing.xs,
  },
  debtColLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textMuted,
    letterSpacing: 0.8,
  },
  debtColValue: {
    fontSize: 20,
    fontWeight: "800",
  },
  debtDivider: {
    width: 1,
    height: 36,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },
  debtNetFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  debtNetLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  debtNetValue: {
    fontSize: 15,
    fontWeight: "700",
  },
});
