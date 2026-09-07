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
            {/* 1. Big Total Income This Month Card (Hero Card) */}
            <View style={styles.incomeCard}>
              <View style={styles.incomeBadge}>
                <View style={styles.incomeDot} />
                <Text style={styles.cardHeaderLabel}>TOTAL INCOME THIS MONTH</Text>
              </View>
              <Text style={styles.incomeAmount} numberOfLines={1} adjustsFontSizeToFit>
                {formatCurrency(data.monthlyIncome)}
              </Text>
            </View>

            {/* 2. Expenses Breakdown: Total, Paid, Unpaid */}
            <View style={styles.pillarsGrid}>
              <View style={styles.pillarTile}>
                <View style={styles.pillarHeaderRow}>
                  <View style={[styles.pillarDot, { backgroundColor: colors.textSecondary }]} />
                  <Text style={styles.pillarLabel} numberOfLines={1}>Total</Text>
                </View>
                <Text style={[styles.pillarValue, { color: colors.textPrimary }]} numberOfLines={1} adjustsFontSizeToFit>
                  {formatCurrency(data.totalExpenses)}
                </Text>
              </View>

              <View style={styles.pillarTile}>
                <View style={styles.pillarHeaderRow}>
                  <View style={[styles.pillarDot, { backgroundColor: colors.accent }]} />
                  <Text style={styles.pillarLabel} numberOfLines={1}>Paid</Text>
                </View>
                <Text style={[styles.pillarValue, { color: colors.accent }]} numberOfLines={1} adjustsFontSizeToFit>
                  {formatCurrency(data.paidExpenses)}
                </Text>
              </View>

              <View style={styles.pillarTile}>
                <View style={styles.pillarHeaderRow}>
                  <View
                    style={[
                      styles.pillarDot,
                      { backgroundColor: data.unpaidExpenses > 0 ? colors.warning : colors.accent },
                    ]}
                  />
                  <Text style={styles.pillarLabel} numberOfLines={1}>Unpaid</Text>
                </View>
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
            <View style={styles.balanceCard}>
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

              {/* Sleek Mini Savings Progress Track */}
              <View style={styles.savingsTrackBg}>
                <View
                  style={[
                    styles.savingsTrackFill,
                    {
                      width: `${Math.max(0, Math.min(100, (data.savingsPercentage || 0) * 100))}%`,
                      backgroundColor: data.remainingBalance >= 0 ? colors.accent : colors.danger,
                    },
                  ]}
                />
              </View>
            </View>

            {/* 4. Smart In-Month Insights Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>In-Month Insights</Text>

              {/* Daily Safe-to-Spend Widget */}
              <View style={styles.insightBlock}>
                <View style={styles.insightIconWrap}>
                  <MaterialCommunityIcons name="wallet-outline" size={22} color={colors.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.dailyRow}>
                    <Text style={styles.dailyAmount}>
                      {data.daysRemaining && data.daysRemaining > 0
                        ? formatCurrency(data.dailyAllowance ?? 0)
                        : "—"}
                    </Text>
                    <Text style={styles.dailyUnit}>
                      {data.daysRemaining && data.daysRemaining > 0 ? " / day" : "month ended"}
                    </Text>
                  </View>
                  <Text style={styles.insightDesc}>
                    {data.daysRemaining && data.daysRemaining > 0
                      ? `Safe daily spending for next ${data.daysRemaining} days`
                      : "All days in this billing period have elapsed"}
                  </Text>
                </View>
              </View>

              {/* Needs vs Wants Breakdown */}
              {data.totalExpenses > 0 && (
                <View style={styles.needsWantsContainer}>
                  <View style={styles.rowBetween}>
                    <View style={styles.legendRow}>
                      <View style={[styles.legendDot, { backgroundColor: colors.accent }]} />
                      <Text style={styles.needsWantsLabel}>Needs {data.needsPercentage ?? 0}%</Text>
                    </View>
                    <View style={styles.legendRow}>
                      <View style={[styles.legendDot, { backgroundColor: "#7C4DFF" }]} />
                      <Text style={styles.needsWantsLabel}>Wants {data.wantsPercentage ?? 0}%</Text>
                    </View>
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
            </View>

            {/* 5. Spending by Category (Centered Donut Ring & Full-Width Legend) */}
            <View style={styles.card}>
              <PieChart
                data={data.categoryBreakdown.map((c) => ({
                  label: c.name,
                  value: c.amount,
                  color: c.color,
                }))}
              />
            </View>

            {/* 6. Monthly Trend Bar Chart */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Last 12 months</Text>
              <View style={{ marginTop: spacing.md, alignItems: "center" }}>
                <BarChart data={data.trend.map((t) => ({ month: t.month, value: t.totalExpenses }))} />
              </View>
            </View>

            {/* 7. Budget vs Actual Card with Mini Progress Bars */}
            {data.budgetVsActual.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Budget vs actual</Text>
                {data.budgetVsActual.slice(0, 4).map((b) => {
                  const progress = Math.min(100, (b.actual / Math.max(1, b.budget)) * 100);
                  const isOver = b.actual > b.budget;
                  return (
                    <View key={b.categoryId} style={styles.budgetRow}>
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
                              backgroundColor: isOver ? colors.danger : colors.accent,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
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

  // 1. Big Income Card (Hero)
  incomeCard: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.lg + 4,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  incomeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
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
  cardHeaderLabel: {
    ...typography.small,
    fontSize: 12,
    fontWeight: "700",
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  incomeAmount: {
    fontSize: 36,
    fontWeight: "800",
    color: colors.textPrimary,
    letterSpacing: -0.5,
    marginVertical: 2,
    textAlign: "center",
  },

  // 2. Pillars Grid
  pillarsGrid: {
    flexDirection: "row",
    gap: spacing.sm,
    width: "100%",
  },
  pillarTile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingVertical: spacing.md + 3,
    paddingHorizontal: spacing.xs + 2,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  pillarHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 3,
  },
  pillarDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pillarLabel: {
    ...typography.small,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    color: colors.textSecondary,
    letterSpacing: 0.4,
    textAlign: "center",
  },
  pillarValue: {
    fontSize: 17,
    fontWeight: "800",
    marginTop: 2,
    textAlign: "center",
  },

  // 3. Remaining Balance Card
  balanceCard: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginVertical: 2,
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

  // General Card
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  cardTitle: {
    ...typography.subtitle,
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
  },

  // In-Month Insights Card
  insightBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surfaceRaised,
    padding: spacing.md,
    borderRadius: 16,
    marginTop: spacing.md,
  },
  insightIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(0, 230, 118, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  dailyRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  dailyAmount: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  dailyUnit: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  insightDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // Needs vs Wants Progress Bar
  needsWantsContainer: {
    marginTop: spacing.md,
    gap: spacing.xs + 2,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  needsWantsLabel: {
    ...typography.small,
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
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
