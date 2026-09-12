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
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Hi{user?.name ? `, ${user.name}` : ""} 👋</Text>
          <TouchableOpacity
            style={styles.headerAvatar}
            onPress={() => navigation.navigate("Settings" as any)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Settings"
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
            {/* Income Hero */}
            <TouchableOpacity
              style={styles.incomeHero}
              onPress={() => navigation.navigate("Tabs", { screen: "Income" } as any)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={`Income: ${formatCurrency(data.monthlyIncome)}`}
            >
              <Text style={styles.heroLabel}>INCOME</Text>
              <Text style={styles.heroAmount} numberOfLines={1} adjustsFontSizeToFit>
                {formatCurrency(data.monthlyIncome)}
              </Text>
              {data.expectedIncome !== undefined && data.expectedIncome > 0 && (
                <Text style={styles.heroSub}>
                  {formatCurrency(data.receivedIncome ?? 0)} received · {formatCurrency(data.expectedIncome)} expected
                </Text>
              )}
            </TouchableOpacity>

            {/* Expenses Panel */}
            <View style={styles.expensesPanel}>
              <ExpenseMetric label="Total" value={formatCurrency(data.totalExpenses)} />
              <View style={styles.divider} />
              <ExpenseMetric label="Paid" value={formatCurrency(data.paidExpenses)} />
              <View style={styles.divider} />
              <ExpenseMetric
                label="Unpaid"
                value={formatCurrency(data.unpaidExpenses)}
                color={data.unpaidExpenses > 0 ? colors.warning : undefined}
              />
            </View>

            {/* Balance Card */}
            <View style={[styles.balanceCard, data.remainingBalance < 0 && styles.balanceCardDeficit]}>
              <Text style={styles.balanceLabel}>Remaining Balance</Text>
              <Text
                style={[styles.balanceAmount, { color: data.remainingBalance >= 0 ? colors.textPrimary : colors.danger }]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {formatCurrency(data.remainingBalance)}
              </Text>
              <View style={styles.trackBg}>
                <View
                  style={[styles.trackFill, {
                    width: `${Math.max(0, Math.min(100, (data.savingsPercentage || 0) * 100))}%`,
                    backgroundColor: data.remainingBalance >= 0 ? colors.textPrimary : colors.danger,
                  }]}
                />
              </View>
            </View>

            {/* Spending by Category */}
            {data.categoryBreakdown.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>By Category</Text>
                <View style={styles.card}>
                  <PieChart
                    data={data.categoryBreakdown.map((c, idx) => ({
                      label: c.name,
                      value: c.amount,
                      color: colors.categoryPalette[idx % colors.categoryPalette.length],
                    }))}
                  />
                </View>
              </>
            )}

            {/* Monthly Trend */}
            {data.trend.length > 1 && (
              <>
                <Text style={styles.sectionTitle}>Trend</Text>
                <View style={styles.card}>
                  <View style={{ alignItems: "center", paddingTop: spacing.xs }}>
                    <BarChart data={data.trend.map((t) => ({ month: t.month, value: t.totalExpenses }))} />
                  </View>
                </View>
              </>
            )}

            {/* Budget vs Actual */}
            {data.budgetVsActual.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Budget vs Actual</Text>
                <View style={styles.card}>
                  {data.budgetVsActual.slice(0, 4).map((b, idx) => {
                    const progress = Math.min(100, (b.actual / Math.max(1, b.budget)) * 100);
                    const isOver = b.actual > b.budget;
                    return (
                      <View key={b.categoryId} style={[styles.budgetRow, idx === 0 && { borderTopWidth: 0, paddingTop: 0 }]}>
                        <View style={styles.rowBetween}>
                          <Text style={styles.budgetName}>{b.name}</Text>
                          <Text style={[styles.budgetFigure, isOver && { color: colors.danger }]}>
                            {formatCurrency(b.actual)} / {formatCurrency(b.budget)}
                          </Text>
                        </View>
                        <View style={styles.trackBg}>
                          <View
                            style={[styles.trackFill, {
                              width: `${progress}%`,
                              backgroundColor: isOver ? colors.danger : colors.textPrimary,
                            }]}
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

function ExpenseMetric({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.metricCol}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, color ? { color } : undefined]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  noPad: { paddingHorizontal: 0 },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl + 32,
    gap: spacing.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  greeting: { ...typography.title },
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatarText: { fontSize: 18, fontWeight: "700", color: colors.accent },
  loader: { marginTop: spacing.xxl },

  // Income Hero
  incomeHero: {
    alignItems: "center",
    paddingVertical: spacing.lg,
    gap: spacing.xs,
  },
  heroLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textSecondary,
    letterSpacing: 1,
  },
  heroAmount: {
    fontSize: 42,
    fontWeight: "800",
    color: colors.textPrimary,
    letterSpacing: -0.5,
    textAlign: "center",
  },
  heroSub: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textMuted,
    marginTop: 2,
  },

  // Expenses Panel
  expensesPanel: {
    flexDirection: "row",
    alignItems: "stretch",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  metricCol: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textMuted,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  metricValue: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  divider: {
    width: 1,
    alignSelf: "center",
    height: "60%",
    backgroundColor: "rgba(255,255,255,0.08)",
  },

  // Balance Card
  balanceCard: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: spacing.sm,
  },
  balanceCardDeficit: { borderColor: "rgba(239,68,68,0.35)" },
  balanceLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textSecondary,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: "800",
    letterSpacing: -0.5,
  },

  // Shared track
  trackBg: {
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },
  trackFill: {
    height: "100%",
    borderRadius: 3,
  },

  // Section Headers
  sectionTitle: {
    ...typography.subtitle,
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },

  // Analytics Cards
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },

  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  // Budget rows
  budgetRow: {
    paddingVertical: spacing.sm + 2,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
    marginTop: spacing.xs,
    gap: 8,
  },
  budgetName: { ...typography.body, fontWeight: "600" },
  budgetFigure: { fontSize: 14, fontWeight: "700", color: colors.textSecondary },

  errorCard: { marginTop: spacing.lg, gap: spacing.md },
  errorText: { color: colors.danger },
});
