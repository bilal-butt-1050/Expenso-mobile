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
import { formatCurrency } from "../../utils/currency";
import { RootStackParamList } from "../../types/navigation";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const { selectedMonth, setSelectedMonth } = useAppData();
  const { data, isLoading, refetch } = useDashboard();

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
          <Text style={styles.headerAvatarText}>
            {(user?.name || user?.email || "E")[0].toUpperCase()}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.accent} />}
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
                <MaterialCommunityIcons name="plus" size={20} color={colors.success} />
                <Text style={styles.actionPillText}>Income</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionPill} activeOpacity={0.7} onPress={() => navigation.navigate("ExpenseForm" as any)}>
                <MaterialCommunityIcons name="plus" size={20} color={colors.danger} />
                <Text style={styles.actionPillText}>Expense</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionPill} activeOpacity={0.7} onPress={() => navigation.navigate("Tabs", { screen: "Budget" } as any)}>
                <MaterialCommunityIcons name="chart-donut" size={20} color={colors.accent} />
                <Text style={styles.actionPillText}>Budgets</Text>
              </TouchableOpacity>
            </View>

            {/* ACTION CENTER — Horizontally Scrolling Global Reminders */}
            {(data.unpaidExpenses > 0 || (data.dailyAllowance ?? 0) > 0 || (data.daysRemaining ?? 0) > 0) && (
              <View style={styles.sectionWrap}>
                <Text style={styles.sectionTitle}>Action Center</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.actionCenterScroll}>
                  {data.unpaidExpenses > 0 && (
                    <ActionChip icon="clock-alert-outline" color={colors.warning} label="Total Unpaid Bills" value={formatCurrency(data.unpaidExpenses)} />
                  )}
                  {(data.dailyAllowance ?? 0) > 0 && (
                    <ActionChip icon="calendar-check-outline" color={colors.accent} label="Daily Safe Spend" value={formatCurrency(data.dailyAllowance!)} />
                  )}
                  {(data.daysRemaining ?? 0) > 0 && (
                    <ActionChip icon="timer-sand" color={colors.textSecondary} label="Days Left" value={`${data.daysRemaining} days`} />
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

          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

function ActionChip({ icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
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
  },
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
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  actionPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.surfaceRaised,
    paddingVertical: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionPillText: {
    fontSize: 14,
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
});
