import React from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
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
            {/* 1. Big Total Income This Month Card */}
            <Card style={styles.incomeCard}>
              <View style={styles.rowBetween}>
                <Text style={styles.cardHeaderLabel}>Total Income This Month</Text>
                <View style={styles.incomeBadge}>
                  <MaterialCommunityIcons name="arrow-down-left" size={14} color={colors.accent} />
                  <Text style={styles.incomeBadgeText}>Earnings</Text>
                </View>
              </View>

              <Text style={styles.incomeAmount} numberOfLines={1} adjustsFontSizeToFit>
                {formatCurrency(data.monthlyIncome)}
              </Text>

              <Text style={styles.incomeSub}>Monthly income baseline</Text>
            </Card>

            {/* 2. Expenses Breakdown: Total (Paid + Unpaid), Paid, Unpaid */}
            <View style={styles.pillarsGrid}>
              <View style={styles.pillarTile}>
                <Text style={styles.pillarLabel}>Total Expenses</Text>
                <Text style={[styles.pillarValue, { color: colors.textPrimary }]} numberOfLines={1} adjustsFontSizeToFit>
                  {formatCurrency(data.totalExpenses)}
                </Text>
                <Text style={styles.pillarSub}>Paid + Unpaid</Text>
              </View>

              <View style={styles.pillarTile}>
                <Text style={styles.pillarLabel}>Paid Expenses</Text>
                <Text style={[styles.pillarValue, { color: colors.textPrimary }]} numberOfLines={1} adjustsFontSizeToFit>
                  {formatCurrency(data.paidExpenses)}
                </Text>
                <Text style={styles.pillarSub}>Settled</Text>
              </View>

              <View style={styles.pillarTile}>
                <Text style={styles.pillarLabel}>Unpaid Expenses</Text>
                <Text
                  style={[
                    styles.pillarValue,
                    { color: data.unpaidExpenses > 0 ? colors.warning : colors.accent },
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {formatCurrency(data.unpaidExpenses)}
                </Text>
                <Text style={styles.pillarSub}>
                  {data.unpaidExpenses > 0 ? "Pending dues" : "All clear"}
                </Text>
              </View>
            </View>

            {/* 3. Remaining Balance Card */}
            <Card style={styles.balanceCard}>
              <View style={styles.rowBetween}>
                <Text style={styles.cardHeaderLabel}>Remaining Balance</Text>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        data.remainingBalance >= 0 ? colors.accentMuted + "55" : colors.dangerMuted + "55",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      { color: data.remainingBalance >= 0 ? colors.accent : colors.danger },
                    ]}
                  >
                    {data.remainingBalance >= 0 ? "Surplus" : "Over Budget"}
                  </Text>
                </View>
              </View>

              <Text
                style={[
                  styles.balanceAmount,
                  { color: data.remainingBalance >= 0 ? colors.accent : colors.danger },
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {formatCurrency(data.remainingBalance)}
              </Text>

              <View style={styles.balanceSubRow}>
                <Text style={styles.balanceFormula}>Income − Total Expenses</Text>
                <Text style={styles.balanceSavings}>
                  Savings: {(data.savingsPercentage * 100).toFixed(0)}%
                </Text>
              </View>
            </Card>

            {/* Smart In-Month Insights Card */}
            <Card style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.cardTitle}>In-Month Insights</Text>
                {data.pacingStatus && (
                  <View
                    style={[
                      styles.pacingBadge,
                      {
                        backgroundColor:
                          data.pacingStatus === "On Track"
                            ? colors.accentMuted + "44"
                            : data.pacingStatus === "Pacing Fast"
                            ? colors.warning + "33"
                            : colors.dangerMuted + "55",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.pacingBadgeText,
                        {
                          color:
                            data.pacingStatus === "On Track"
                              ? colors.accent
                              : data.pacingStatus === "Pacing Fast"
                              ? colors.warning
                              : colors.danger,
                        },
                      ]}
                    >
                      {data.pacingStatus}
                    </Text>
                  </View>
                )}
              </View>

              {/* Daily Safe-to-Spend */}
              <View style={styles.insightBlock}>
                <View style={styles.insightIconWrap}>
                  <MaterialCommunityIcons name="wallet-outline" size={20} color={colors.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.insightTitle}>
                    {data.daysRemaining && data.daysRemaining > 0
                      ? `${formatCurrency(data.dailyAllowance ?? 0)} / day`
                      : "Month ended"}
                  </Text>
                  <Text style={styles.insightDesc}>
                    {data.daysRemaining && data.daysRemaining > 0
                      ? `Safe to spend for the remaining ${data.daysRemaining} days`
                      : "All days in this billing period have elapsed"}
                  </Text>
                </View>
              </View>

              {/* Needs vs Wants Breakdown */}
              {data.totalExpenses > 0 && (
                <View style={styles.needsWantsContainer}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.needsWantsLabel}>Spending Purpose</Text>
                    <Text style={styles.needsWantsValues}>
                      Needs {data.needsPercentage ?? 0}% · Wants {data.wantsPercentage ?? 0}%
                    </Text>
                  </View>

                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barSegmentNeeds,
                        { width: `${Math.max(4, Math.min(96, data.needsPercentage ?? 0))}%` },
                      ]}
                    />
                    <View
                      style={[
                        styles.barSegmentWants,
                        { width: `${Math.max(4, Math.min(96, data.wantsPercentage ?? 0))}%` },
                      ]}
                    />
                  </View>
                </View>
              )}
            </Card>

            {/* Spending by Category Card (Donut with full-width legend) */}
            <Card style={styles.card}>
              <Text style={styles.cardTitle}>Spending by category</Text>
              <View style={{ marginTop: spacing.sm }}>
                <PieChart
                  data={data.categoryBreakdown.map((c) => ({
                    label: c.name,
                    value: c.amount,
                    color: c.color,
                  }))}
                />
              </View>
            </Card>

            {/* Monthly Trend Bar Chart */}
            <Card style={styles.card}>
              <Text style={styles.cardTitle}>Last 12 months</Text>
              <View style={{ marginTop: spacing.md, alignItems: "center" }}>
                <BarChart data={data.trend.map((t) => ({ month: t.month, value: t.totalExpenses }))} />
              </View>
            </Card>

            {/* Budget vs Actual Card */}
            {data.budgetVsActual.length > 0 && (
              <Card style={styles.card}>
                <Text style={styles.cardTitle}>Budget vs actual</Text>
                {data.budgetVsActual.slice(0, 4).map((b) => (
                  <View key={b.categoryId} style={styles.budgetRow}>
                    <Text style={styles.budgetLabel}>{b.name}</Text>
                    <Text style={[styles.budgetStatus, b.status === "Over Budget" && { color: colors.danger }]}>
                      {formatCurrency(b.actual)} / {formatCurrency(b.budget)}
                    </Text>
                  </View>
                ))}
              </Card>
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
  loader: { marginTop: spacing.xxl },

  // 1. Big Income Card
  incomeCard: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  cardHeaderLabel: {
    ...typography.small,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  incomeAmount: {
    fontSize: 32,
    fontWeight: "800",
    color: colors.textPrimary,
    letterSpacing: -0.5,
    marginVertical: spacing.xs,
  },
  incomeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.accentMuted + "44",
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  incomeBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.accent,
  },
  incomeSub: {
    ...typography.small,
    color: colors.textMuted,
  },

  // 3. Remaining Balance Card
  balanceCard: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginVertical: spacing.xs,
  },
  balanceSubRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border + "88",
    marginTop: spacing.xs,
  },
  balanceFormula: {
    ...typography.small,
    color: colors.textSecondary,
    fontSize: 12,
  },
  balanceSavings: {
    ...typography.small,
    color: colors.accent,
    fontWeight: "700",
    fontSize: 12,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },

  // 3-Pillars Grid
  pillarsGrid: {
    flexDirection: "row",
    gap: spacing.sm,
    width: "100%",
  },
  pillarTile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: "space-between",
  },
  pillarLabel: {
    ...typography.small,
    fontSize: 10,
    textTransform: "uppercase",
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  pillarValue: {
    fontSize: 14,
    fontWeight: "700",
    marginTop: 4,
    marginBottom: 2,
  },
  pillarSub: {
    ...typography.small,
    fontSize: 10,
    color: colors.textMuted,
  },

  // In-Month Insights Card
  card: {
    padding: spacing.lg,
  },
  cardTitle: {
    ...typography.subtitle,
    fontSize: 16,
  },
  pacingBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  pacingBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  insightBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surfaceRaised,
    padding: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.md,
  },
  insightIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accentMuted + "44",
    alignItems: "center",
    justifyContent: "center",
  },
  insightTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  insightDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // Needs vs Wants Progress Bar
  needsWantsContainer: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  needsWantsLabel: {
    ...typography.small,
    color: colors.textSecondary,
    fontSize: 12,
  },
  needsWantsValues: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  barTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surfaceRaised,
    flexDirection: "row",
    overflow: "hidden",
    marginTop: 4,
  },
  barSegmentNeeds: {
    height: "100%",
    backgroundColor: colors.accent,
  },
  barSegmentWants: {
    height: "100%",
    backgroundColor: "#7C4DFF",
  },

  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  budgetRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.sm,
  },
  budgetLabel: { ...typography.body },
  budgetStatus: { ...typography.caption, fontWeight: "600" },
  errorCard: { marginTop: spacing.lg, gap: spacing.md },
  errorText: { color: colors.danger },
});
