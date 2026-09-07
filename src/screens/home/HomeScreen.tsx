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
              <Text style={styles.cardHeaderLabel}>Total Income This Month</Text>
              <Text style={styles.incomeAmount} numberOfLines={1} adjustsFontSizeToFit>
                {formatCurrency(data.monthlyIncome)}
              </Text>
            </Card>

            {/* 2. Expenses Breakdown: Total (Paid + Unpaid), Paid, Unpaid */}
            <View style={styles.pillarsGrid}>
              <View style={styles.pillarTile}>
                <Text style={styles.pillarLabel} numberOfLines={1}>Total Expenses</Text>
                <Text style={[styles.pillarValue, { color: colors.textPrimary }]} numberOfLines={1} adjustsFontSizeToFit>
                  {formatCurrency(data.totalExpenses)}
                </Text>
              </View>

              <View style={styles.pillarTile}>
                <Text style={styles.pillarLabel} numberOfLines={1}>Paid Expenses</Text>
                <Text style={[styles.pillarValue, { color: colors.textPrimary }]} numberOfLines={1} adjustsFontSizeToFit>
                  {formatCurrency(data.paidExpenses)}
                </Text>
              </View>

              <View style={styles.pillarTile}>
                <Text style={styles.pillarLabel} numberOfLines={1}>Unpaid Expenses</Text>
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
              </View>
            </View>

            {/* 3. Remaining Balance Card */}
            <Card style={styles.balanceCard}>
              <View style={styles.rowBetween}>
                <Text style={[styles.cardHeaderLabel, { flex: 1, marginRight: spacing.sm }]}>
                  Remaining Balance After Clearing Dues
                </Text>
                <View style={styles.savingsBadge}>
                  <Text style={styles.savingsBadgeText}>
                    Savings: {(data.savingsPercentage * 100).toFixed(0)}%
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
            </Card>

            {/* Smart In-Month Insights Card */}
            <Card style={styles.card}>
              <Text style={styles.cardTitle}>In-Month Insights</Text>

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
              <PieChart
                data={data.categoryBreakdown.map((c) => ({
                  label: c.name,
                  value: c.amount,
                  color: c.color,
                }))}
              />
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
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  cardHeaderLabel: {
    ...typography.small,
    fontSize: 13,
    fontWeight: "700",
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  incomeAmount: {
    fontSize: 34,
    fontWeight: "800",
    color: colors.textPrimary,
    letterSpacing: -0.5,
    marginVertical: spacing.xs,
    textAlign: "center",
  },

  // 3. Remaining Balance Card
  balanceCard: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  balanceAmount: {
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginVertical: spacing.xs,
  },
  savingsBadge: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  savingsBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
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
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  pillarLabel: {
    ...typography.small,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    color: colors.textSecondary,
    letterSpacing: 0.5,
    textAlign: "center",
  },
  pillarValue: {
    fontSize: 18,
    fontWeight: "800",
    marginTop: spacing.xs,
    textAlign: "center",
  },

  // In-Month Insights Card
  card: {
    padding: spacing.lg,
  },
  cardTitle: {
    ...typography.subtitle,
    fontSize: 18,
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
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.accentMuted + "44",
    alignItems: "center",
    justifyContent: "center",
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  insightDesc: {
    fontSize: 14,
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
    fontSize: 13,
    fontWeight: "600",
  },
  needsWantsValues: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  barTrack: {
    height: 10,
    borderRadius: 5,
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
