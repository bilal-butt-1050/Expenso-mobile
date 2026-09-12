import React from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useDashboard } from "../../hooks/useDashboard";
import { useAppData } from "../../context/AppDataContext";
import { useAuth } from "../../context/AuthContext";
import { ScreenContainer } from "../../components/ScreenContainer";
import { Card } from "../../components/Card";
import { MonthPicker } from "../../components/MonthPicker";
import { PieChart } from "../../components/PieChart";
import { BarChart } from "../../components/BarChart";
import { Button } from "../../components/Button";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { formatCurrency } from "../../utils/currency";
import { RootStackParamList } from "../../types/navigation";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const { selectedMonth, setSelectedMonth } = useAppData();
  const { data, isLoading, error, refetch } = useDashboard();

  return (
    <ScreenContainer style={styles.noPad}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.accent} />}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hi{user?.name ? `, ${user.name}` : ""} 👋</Text>
            <Text style={styles.subGreeting}>Here's your monthly money flow</Text>
          </View>
          <TouchableOpacity
            style={styles.headerAvatar}
            onPress={() => navigation.navigate("Settings" as any)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Settings"
            accessibilityHint="Navigate to settings screen"
          >
            <Text style={styles.headerAvatarText}>
              {(user?.name || user?.email || "E")[0].toUpperCase()}
            </Text>
          </TouchableOpacity>
        </View>

        <MonthPicker month={selectedMonth} onChange={setSelectedMonth} />

        {error ? (
          <Card style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
            <Button label="Retry" variant="secondary" onPress={refetch} />
          </Card>
        ) : !data ? (
          <ActivityIndicator style={styles.loader} color={colors.accent} />
        ) : (
          <>
            {/* 1. Hero Total Income This Month (Interactive & Linked to Income Tab) */}
            <TouchableOpacity
              style={styles.incomeHero}
              onPress={() => navigation.navigate("Tabs", { screen: "Income" } as any)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={`Total Income This Month: ${formatCurrency(data.monthlyIncome)}. Navigate to Income tab.`}
            >
              <View style={styles.incomeBadge}>
                <View style={styles.incomeDot} />
                <Text style={styles.incomeBadgeText}>TOTAL INCOME THIS MONTH</Text>
                <MaterialCommunityIcons name="chevron-right" size={13} color={colors.textSecondary} />
              </View>
              <Text style={styles.incomeAmount} numberOfLines={1} adjustsFontSizeToFit>
                {formatCurrency(data.monthlyIncome)}
              </Text>
              {data.expectedIncome !== undefined && data.expectedIncome > 0 ? (
                <View style={styles.incomeBreakdownRow}>
                  <Text style={styles.incomeBreakdownReceived}>
                    {formatCurrency(data.receivedIncome ?? 0)} received
                  </Text>
                  <Text style={styles.incomeBreakdownDot}>·</Text>
                  <Text style={styles.incomeBreakdownExpected}>
                    {formatCurrency(data.expectedIncome)} expected
                  </Text>
                </View>
              ) : null}
            </TouchableOpacity>

            {/* 2. Expenses Section Header */}
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionHeaderLeft}>
                <MaterialCommunityIcons name="arrow-top-right" size={18} color={colors.textSecondary} />
                <Text style={styles.sectionTitle}>Expenses</Text>
              </View>
            </View>

            {/* Unified 3-Segment Expenses Precision Panel */}
            <View style={styles.expensesSegmentedBar}>
              {/* Total Segment */}
              <View style={styles.expenseSegment}>
                <View style={styles.segmentHeaderRow}>
                  <View style={[styles.segmentDot, { backgroundColor: colors.textMuted }]} />
                  <Text style={styles.segmentLabel}>TOTAL</Text>
                </View>
                <Text style={[styles.segmentValue, { color: colors.textPrimary }]} numberOfLines={1} adjustsFontSizeToFit>
                  {formatCurrency(data.totalExpenses)}
                </Text>
              </View>

              {/* Vertical Hairline Divider */}
              <View style={styles.segmentDivider} />

              {/* Paid Segment */}
              <View style={styles.expenseSegment}>
                <View style={styles.segmentHeaderRow}>
                  <View style={[styles.segmentDot, { backgroundColor: colors.textPrimary }]} />
                  <Text style={styles.segmentLabel}>PAID</Text>
                </View>
                <Text style={[styles.segmentValue, { color: colors.textPrimary }]} numberOfLines={1} adjustsFontSizeToFit>
                  {formatCurrency(data.paidExpenses)}
                </Text>
              </View>

              {/* Vertical Hairline Divider */}
              <View style={styles.segmentDivider} />

              {/* Unpaid Segment */}
              <View style={styles.expenseSegment}>
                <View style={styles.segmentHeaderRow}>
                  <View
                    style={[
                      styles.segmentDot,
                      { backgroundColor: data.unpaidExpenses > 0 ? colors.warning : colors.textMuted },
                    ]}
                  />
                  <Text style={styles.segmentLabel}>UNPAID</Text>
                </View>
                <Text
                  style={[
                    styles.segmentValue,
                    { color: data.unpaidExpenses > 0 ? colors.warning : colors.textPrimary },
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {formatCurrency(data.unpaidExpenses)}
                </Text>
              </View>
            </View>

            {/* 3. Executive Remaining Balance Card */}
            <View
              style={[
                styles.balanceCard,
                data.remainingBalance >= 0 ? styles.balanceCardSurplus : styles.balanceCardDeficit,
              ]}
            >
              <View style={styles.balanceHeaderRow}>
                <Text style={styles.balanceHeaderLabel}>
                  Remaining Balance After Clearing Dues
                </Text>
                <View
                  style={[
                    styles.savingsBadge,
                    Boolean(
                      user?.savingsGoal &&
                        user.savingsGoal > 0 &&
                        data.savingsPercentage * 100 >= user.savingsGoal
                    ) && {
                      borderColor: colors.accent,
                      backgroundColor: "rgba(0, 230, 118, 0.12)",
                    },
                  ]}
                >
                  <Text style={styles.savingsBadgeText}>
                    Savings: {(data.savingsPercentage * 100).toFixed(0)}%
                    {user?.savingsGoal && user.savingsGoal > 0
                      ? ` / ${user.savingsGoal}%${data.savingsPercentage * 100 >= user.savingsGoal ? " ✓" : ""}`
                      : ""}
                  </Text>
                </View>
              </View>

              <Text
                style={[
                  styles.balanceAmount,
                  { color: data.remainingBalance >= 0 ? colors.textPrimary : colors.danger },
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {formatCurrency(data.remainingBalance)}
              </Text>

              {/* Sleek Mini Savings Progress Track */}
              <View style={styles.savingsTrackBg}>
                <View
                  style={[
                    styles.savingsTrackFill,
                    {
                      width: `${Math.max(0, Math.min(100, (data.savingsPercentage || 0) * 100))}%`,
                      backgroundColor: data.remainingBalance >= 0 ? colors.textPrimary : colors.danger,
                    },
                  ]}
                />
              </View>

              {data.cashInHand !== undefined && (
                <View style={styles.cashInHandRow}>
                  <Text style={styles.cashInHandLabel}>
                    Cash in Hand:{" "}
                    <Text
                      style={[
                        styles.cashInHandVal,
                        { color: data.cashInHand >= 0 ? colors.textPrimary : colors.danger },
                      ]}
                    >
                      {formatCurrency(data.cashInHand)}
                    </Text>
                  </Text>
                  {data.expectedIncome !== undefined && data.expectedIncome > 0 && (
                    <Text style={styles.cashInHandPending}>
                      · {formatCurrency(data.expectedIncome)} pending
                    </Text>
                  )}
                </View>
              )}
            </View>

            {/* 4. Spending by Category (Centered Donut Ring & Full-Width Legend) */}
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionHeaderLeft}>
                <MaterialCommunityIcons name="chart-donut" size={18} color={colors.textSecondary} />
                <Text style={styles.sectionTitle}>Spending by Category</Text>
              </View>
            </View>
            <View style={styles.analyticsCard}>
              <PieChart
                data={data.categoryBreakdown.map((c, idx) => ({
                  label: c.name,
                  value: c.amount,
                  color: colors.categoryPalette[idx % colors.categoryPalette.length],
                }))}
              />
            </View>

            {/* 5. Monthly Trend Bar Chart */}
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionHeaderLeft}>
                <MaterialCommunityIcons name="chart-box-outline" size={18} color={colors.textSecondary} />
                <Text style={styles.sectionTitle}>Last 12 Months</Text>
              </View>
            </View>
            <View style={styles.analyticsCard}>
              <View style={{ alignItems: "center", paddingTop: spacing.xs }}>
                <BarChart data={data.trend.map((t) => ({ month: t.month, value: t.totalExpenses }))} />
              </View>
            </View>

            {/* 6. Budget vs Actual Card with Mini Progress Bars */}
            {data.budgetVsActual.length > 0 && (
              <>
                <View style={styles.sectionHeaderRow}>
                  <View style={styles.sectionHeaderLeft}>
                    <MaterialCommunityIcons name="bullseye-arrow" size={18} color={colors.textSecondary} />
                    <Text style={styles.sectionTitle}>Budget vs Actual</Text>
                  </View>
                </View>
                <View style={styles.analyticsCard}>
                  {data.budgetVsActual.slice(0, 4).map((b, idx) => {
                    const progress = Math.min(100, (b.actual / Math.max(1, b.budget)) * 100);
                    const isOver = b.actual > b.budget;
                    return (
                      <View
                        key={b.categoryId}
                        style={[
                          styles.budgetRow,
                          idx === 0 && { borderTopWidth: 0, marginTop: 0, paddingTop: 0 },
                        ]}
                      >
                        <View style={styles.rowBetween}>
                          <Text style={styles.budgetLabel}>{b.name}</Text>
                          <Text style={[styles.budgetStatus, isOver && { color: colors.danger }]}>
                            {formatCurrency(b.actual)} / {formatCurrency(b.budget)}
                          </Text>
                        </View>
                        <View style={styles.budgetProgressTrack}>
                          <View
                            style={[
                              styles.budgetProgressFill,
                              {
                                width: `${progress}%`,
                                backgroundColor: isOver ? colors.danger : colors.textPrimary,
                              },
                            ]}
                          />
                        </View>
                      </View>
                    );
                  })}
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  noPad: { paddingHorizontal: 0 },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg + 4,
    paddingBottom: spacing.xxl + 24,
    gap: spacing.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  greeting: { ...typography.title, fontSize: 24, letterSpacing: -0.3 },
  subGreeting: { ...typography.caption, marginTop: 4 },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatarText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.accent,
  },
  loader: { marginTop: spacing.xxl },

  // 1. Hero Total Income This Month (Open & Minimalist)
  incomeHero: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  incomeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
    marginBottom: 2,
  },
  incomeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  incomeBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  incomeAmount: {
    fontSize: 38,
    fontWeight: "800",
    color: colors.textPrimary,
    letterSpacing: -0.6,
    marginVertical: 2,
    textAlign: "center",
  },
  incomeBreakdownRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  incomeBreakdownReceived: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.accent,
  },
  incomeBreakdownDot: {
    fontSize: 12,
    color: colors.textMuted,
  },
  incomeBreakdownExpected: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFB300",
  },
  cashInHandRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: spacing.xs + 2,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.06)",
  },
  cashInHandLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  cashInHandVal: {
    fontWeight: "700",
  },
  cashInHandPending: {
    fontSize: 11,
    color: "#FFB300",
    fontWeight: "500",
  },

  // Section Headers
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.xs,
    marginBottom: -spacing.xs + 2,
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    ...typography.subtitle,
    fontSize: 17,
    fontWeight: "700",
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },

  // 2. Expenses Unified Precision Segmented Panel
  expensesSegmentedBar: {
    flexDirection: "row",
    alignItems: "stretch",
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.xs,
  },
  expenseSegment: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xs,
  },
  segmentHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 3,
  },
  segmentDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  segmentLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  segmentValue: {
    fontSize: 17,
    fontWeight: "800",
    marginTop: 2,
    textAlign: "center",
  },
  segmentDivider: {
    width: 1,
    height: "68%",
    alignSelf: "center",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },

  // 3. Executive Remaining Balance Card
  balanceCard: {
    borderRadius: 18,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  balanceCardSurplus: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  balanceCardDeficit: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.35)",
  },
  balanceHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  balanceHeaderLabel: {
    ...typography.small,
    fontSize: 12,
    fontWeight: "700",
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    flex: 1,
    marginRight: spacing.sm,
  },
  balanceAmount: {
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginVertical: 4,
  },
  savingsBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.07)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.18)",
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  savingsBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  savingsTrackBg: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    overflow: "hidden",
    marginTop: spacing.xs,
  },
  savingsTrackFill: {
    height: "100%",
    borderRadius: 2,
  },

  // Analytics Cards
  analyticsCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },

  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  // Budget vs Actual
  budgetRow: {
    paddingVertical: spacing.sm + 2,
    borderTopWidth: 1,
    borderTopColor: colors.border + "66",
    marginTop: spacing.xs,
    gap: 6,
  },
  budgetLabel: {
    ...typography.body,
    fontSize: 15,
    fontWeight: "600",
  },
  budgetStatus: {
    ...typography.caption,
    fontSize: 13,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  budgetProgressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    overflow: "hidden",
    width: "100%",
  },
  budgetProgressFill: {
    height: "100%",
    borderRadius: 2,
  },

  errorCard: { marginTop: spacing.lg, gap: spacing.md },
  errorText: { color: colors.danger },
});
