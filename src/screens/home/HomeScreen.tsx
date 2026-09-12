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
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hi{user?.name ? `, ${user.name}` : ""} 👋</Text>
            <Text style={styles.subGreeting}>Here's your financial overview</Text>
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

        <MonthPicker month={selectedMonth} onChange={setSelectedMonth} />

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
                label="Income" 
                color={colors.success} 
                onPress={() => navigation.navigate("IncomeForm" as any)} 
              />
              <QuickAction 
                icon="arrow-up" 
                label="Expense" 
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

            {/* Income & Spent Summary */}
            <View style={styles.summaryRow}>
              <View style={styles.summaryCard}>
                <View style={styles.summaryIconBoxRow}>
                  <View style={[styles.summaryIconBox, { backgroundColor: colors.successMuted }]}>
                    <MaterialCommunityIcons name="arrow-down-bold" size={16} color={colors.success} />
                  </View>
                  <Text style={styles.summaryLabel}>Income</Text>
                </View>
                <Text style={styles.summaryAmount} numberOfLines={1} adjustsFontSizeToFit>
                  {formatCurrency(data.monthlyIncome)}
                </Text>
              </View>
              
              <View style={styles.summaryCard}>
                <View style={styles.summaryIconBoxRow}>
                  <View style={[styles.summaryIconBox, { backgroundColor: colors.dangerMuted }]}>
                    <MaterialCommunityIcons name="arrow-up-bold" size={16} color={colors.danger} />
                  </View>
                  <Text style={styles.summaryLabel}>Spent</Text>
                </View>
                <Text style={styles.summaryAmount} numberOfLines={1} adjustsFontSizeToFit>
                  {formatCurrency(data.totalExpenses)}
                </Text>
              </View>
            </View>

            {/* Daily Allowance (If pacing helps) */}
            {data.dailyAllowance !== undefined && data.dailyAllowance > 0 && (
              <View style={styles.card}>
                <View style={styles.rowBetween}>
                  <View>
                    <Text style={styles.cardTitle}>Daily Allowance</Text>
                    <Text style={styles.cardSub}>Safe to spend per day</Text>
                  </View>
                  <Text style={styles.cardHighlight}>{formatCurrency(data.dailyAllowance)}</Text>
                </View>
              </View>
            )}

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

function QuickAction({ icon, label, color, onPress }: { icon: any, label: string, color: string, onPress: () => void }) {
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
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl + 40,
    gap: spacing.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  greeting: { ...typography.title },
  subGreeting: { ...typography.caption, color: colors.textMuted },
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

  summaryRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  summaryIconBoxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  summaryIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  summaryAmount: {
    fontSize: 22,
    fontWeight: "800",
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
