import React from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
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
import { spacing } from "../../theme/spacing";
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
            <Text style={styles.subGreeting}>Here's your money at a glance</Text>
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
            <View style={styles.metricsGrid}>
              <MetricTile label="Income" value={data.monthlyIncome} highlight />
              <MetricTile label="Expenses" value={data.totalExpenses} />
              <MetricTile
                label="Remaining"
                value={data.remainingBalance}
                tone={data.remainingBalance >= 0 ? "good" : "bad"}
              />
              <MetricTile
                label="Unpaid"
                value={data.unpaidExpenses}
                tone={data.unpaidExpenses > 0 ? "bad" : undefined}
              />
            </View>

            <Card style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.cardTitle}>Projected balance</Text>
                <Text style={styles.caption}>after pending dues</Text>
              </View>
              <Text
                style={[
                  typography.metricValue,
                  { color: data.projectedBalance >= 0 ? colors.accent : colors.danger, marginTop: spacing.xs },
                ]}
              >
                {formatCurrency(data.projectedBalance)}
              </Text>
              <Text style={styles.caption}>
                All-time savings: {formatCurrency(data.savingsAllTime)} · This month:{" "}
                {(data.savingsPercentage * 100).toFixed(0)}%
              </Text>
            </Card>

            <Card style={styles.card}>
              <Text style={styles.cardTitle}>Spending by category</Text>
              <View style={{ marginTop: spacing.md }}>
                <PieChart
                  data={data.categoryBreakdown.map((c) => ({ label: c.name, value: c.amount, color: c.color }))}
                />
              </View>
            </Card>

            <Card style={styles.card}>
              <Text style={styles.cardTitle}>Last 12 months</Text>
              <View style={{ marginTop: spacing.md, alignItems: "center" }}>
                <BarChart data={data.trend.map((t) => ({ month: t.month, value: t.totalExpenses }))} />
              </View>
            </Card>

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

function MetricTile({
  label,
  value,
  highlight,
  tone,
}: {
  label: string;
  value: number;
  highlight?: boolean;
  tone?: "good" | "bad";
}) {
  const color = tone === "bad" ? colors.danger : highlight ? colors.accent : colors.textPrimary;
  return (
    <Card style={styles.tile}>
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={[styles.tileValue, { color }]} numberOfLines={1} adjustsFontSizeToFit>
        {formatCurrency(value)}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  noPad: { paddingHorizontal: 0 },
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
  greeting: { ...typography.title },
  subGreeting: { ...typography.caption, marginTop: 2 },
  loader: { marginTop: spacing.xxl },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.md },
  tile: { width: "48%", padding: spacing.md },
  tileLabel: { ...typography.small, textTransform: "uppercase", letterSpacing: 0.5 },
  tileValue: { fontSize: 18, fontWeight: "700", marginTop: spacing.xs },
  card: { marginTop: spacing.md },
  cardTitle: { ...typography.subtitle },
  caption: { ...typography.small, marginTop: spacing.xs },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
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
