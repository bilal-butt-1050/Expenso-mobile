import React from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useDashboard } from "../../hooks/useDashboard";
import { useAppData } from "../../context/AppDataContext";
import { useAuth } from "../../context/AuthContext";
import { ScreenContainer } from "../../components/ScreenContainer";
import { MonthPicker } from "../../components/MonthPicker";
import { HomeSkeleton } from "../../components/Skeleton";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { formatCurrency } from "../../utils/currency";
import { RootStackParamList } from "../../types/navigation";
import { BarChart } from "../../components/BarChart";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const { selectedMonth, setSelectedMonth } = useAppData();
  const { data, isLoading, refetch } = useDashboard();

  return (
    <ScreenContainer style={styles.noPad}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.accent} />}
      >
        {/* Top Control Row */}
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
            <Text style={styles.headerAvatarText}>
              {(user?.name || user?.email || "E")[0].toUpperCase()}
            </Text>
          </TouchableOpacity>
        </View>

        {!data ? (
          <HomeSkeleton />
        ) : (
          <>
            {/* Main Balance Hero */}
            <View style={styles.heroSection}>
              <Text style={styles.heroLabel}>AVAILABLE BALANCE</Text>
              <Text style={styles.heroAmount} numberOfLines={1} adjustsFontSizeToFit>
                {formatCurrency(data.remainingBalance)}
              </Text>
              
              {data.pacingStatus && (
                <View style={[
                  styles.statusPill, 
                  data.pacingStatus === "On Track" ? styles.statusPillGood : 
                  data.pacingStatus === "Over Budget" ? styles.statusPillBad : styles.statusPillWarn
                ]}>
                  <MaterialCommunityIcons 
                    name={data.pacingStatus === "On Track" ? "check-circle" : "alert-circle"} 
                    size={14} 
                    color={
                      data.pacingStatus === "On Track" ? colors.success : 
                      data.pacingStatus === "Over Budget" ? colors.danger : colors.warning
                    } 
                  />
                  <Text style={[
                    styles.statusText, 
                    { color: data.pacingStatus === "On Track" ? colors.success : 
                             data.pacingStatus === "Over Budget" ? colors.danger : colors.warning }
                  ]}>
                    {data.pacingStatus}
                  </Text>
                </View>
              )}
            </View>

            {/* Quick Actions Row */}
            <View style={styles.quickActions}>
              <QuickAction 
                icon="arrow-down" 
                label="Add Income" 
                color={colors.success} 
                onPress={() => navigation.navigate("IncomeForm" as any)} 
              />
              <QuickAction 
                icon="arrow-up" 
                label="Add Expense" 
                color={colors.danger} 
                onPress={() => navigation.navigate("ExpenseForm" as any)} 
              />
              <QuickAction 
                icon="chart-donut" 
                label="Budgets" 
                color={colors.accent} 
                onPress={() => navigation.navigate("Tabs", { screen: "Budget" } as any)} 
              />
            </View>

            {/* This Month's Insights */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>This Month's Insights</Text>
              
              <InsightRow 
                icon="arrow-down-bold" 
                color={colors.success} 
                title="Income" 
                subtitle="Total funds received" 
                value={formatCurrency(data.monthlyIncome)} 
              />
              
              <InsightRow 
                icon="arrow-up-bold" 
                color={colors.danger} 
                title="Spent" 
                subtitle="Total outflows" 
                value={formatCurrency(data.totalExpenses)} 
              />

              <InsightRow 
                icon="piggy-bank" 
                color={colors.accent} 
                title="Savings Rate" 
                subtitle="Portion of income saved" 
                value={`${Math.round(data.savingsPercentage * 100)}%`} 
              />

              <InsightRow 
                icon="speedometer" 
                color={
                  data.pacingStatus === "On Track" ? colors.success :
                  data.pacingStatus === "Pacing Fast" ? colors.warning : colors.danger
                } 
                title="Pacing" 
                subtitle="Spending speed" 
                value={data.pacingStatus || "N/A"}
                valueColor={
                  data.pacingStatus === "On Track" ? colors.success :
                  data.pacingStatus === "Pacing Fast" ? colors.warning : colors.danger
                }
              />

              {data.dailyAllowance !== undefined && data.dailyAllowance > 0 && (
                <InsightRow 
                  icon="calendar-today" 
                  color={colors.accent} 
                  title="Daily Allowance" 
                  subtitle="Safe to spend per day" 
                  value={formatCurrency(data.dailyAllowance)} 
                />
              )}
            </View>

            {/* Needs vs Wants Breakdown */}
            {(data.needsPercentage !== undefined && data.wantsPercentage !== undefined && data.totalExpenses > 0) && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Spending Split</Text>
                <View style={styles.splitTrack}>
                  <View style={[styles.splitFill, { width: `${data.needsPercentage}%`, backgroundColor: colors.accent }]} />
                  <View style={[styles.splitFill, { width: `${data.wantsPercentage}%`, backgroundColor: colors.warning }]} />
                </View>
                <View style={styles.rowBetween}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: colors.accent }]} />
                    <Text style={styles.legendText}>Needs ({Math.round(data.needsPercentage)}%)</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: colors.warning }]} />
                    <Text style={styles.legendText}>Wants ({Math.round(data.wantsPercentage)}%)</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Spending Trend */}
            {data.trend.length > 1 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>6-Month Trend</Text>
                <View style={{ alignItems: "center", paddingTop: spacing.md, paddingBottom: spacing.sm }}>
                  <BarChart data={data.trend.slice(-6).map((t) => ({ month: t.month, value: t.totalExpenses }))} />
                </View>
              </View>
            )}

          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

function InsightRow({ icon, color, title, subtitle, value, valueColor }: { 
  icon: any; 
  color: string; 
  title: string; 
  subtitle: string; 
  value: string; 
  valueColor?: string;
}) {
  return (
    <View style={styles.insightRow}>
      <View style={[styles.insightIconBox, { backgroundColor: color + "20" }]}> 
        <MaterialCommunityIcons name={icon} size={20} color={color} />
      </View>
      <View style={styles.insightTextWrap}>
        <Text style={styles.insightTitle}>{title}</Text>
        <Text style={styles.insightSub}>{subtitle}</Text>
      </View>
      <Text style={[styles.insightValue, valueColor ? { color: valueColor } : null]}>
        {value}
      </Text>
    </View>
  );
}

function QuickAction({ icon, label, color, onPress }: { icon: any; label: string; color: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.quickActionBtn} onPress={onPress} activeOpacity={0.7} accessibilityRole="button">
      <View style={[styles.quickActionIcon, { backgroundColor: `${color}1A` }]}>
        <MaterialCommunityIcons name={icon} size={24} color={color} />
      </View>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  noPad: { paddingHorizontal: 0 },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm, // reduced padding since we combined rows
    paddingBottom: spacing.xxl + 40,
    gap: spacing.lg,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  },
  headerAvatarText: { fontSize: 18, fontWeight: "700", color: colors.accent },
  
  heroSection: {
    alignItems: "center",
    paddingVertical: spacing.lg,
  },
  heroLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textMuted,
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  heroAmount: {
    fontSize: 48,
    fontWeight: "800",
    color: colors.textPrimary,
    letterSpacing: -1,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: spacing.sm,
    borderWidth: 1,
  },
  statusPillGood: { backgroundColor: colors.successMuted, borderColor: `${colors.success}33` },
  statusPillWarn: { backgroundColor: colors.warningMuted, borderColor: `${colors.warning}33` },
  statusPillBad: { backgroundColor: colors.dangerMuted, borderColor: `${colors.danger}33` },
  statusText: { fontSize: 12, fontWeight: "700" },

  quickActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.sm,
  },
  quickActionBtn: {
    alignItems: "center",
    gap: 8,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  quickActionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
  },

  insightRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  insightIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  insightTextWrap: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  insightSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  insightValue: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  cardSub: {
    fontSize: 13,
    color: colors.textMuted,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardHighlight: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.accent,
  },

  splitTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surfaceRaised,
    flexDirection: "row",
    overflow: "hidden",
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  splitFill: {
    height: "100%",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.textSecondary,
  },
});
