import React from "react";
import { View, Text, StyleSheet, StyleProp, ViewStyle } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { formatCurrency } from "../utils/currency";
import { AnimatedProgressBar } from "./AnimatedProgressBar";

interface NeedWantAnalyticsProps {
  income: number;
  needsTotal: number;
  wantsTotal: number;
  savingsTotal: number;
  style?: StyleProp<ViewStyle>;
}

export function NeedWantAnalyticsCard({
  income,
  needsTotal,
  wantsTotal,
  savingsTotal,
  style,
}: NeedWantAnalyticsProps) {
  const effectiveIncome = Math.max(income, needsTotal + wantsTotal, 1);

  const needsRatio = Math.round((needsTotal / effectiveIncome) * 100);
  const wantsRatio = Math.round((wantsTotal / effectiveIncome) * 100);
  const savingsRatio = Math.max(0, 100 - needsRatio - wantsRatio);

  const getHealthInsight = () => {
    if (needsRatio > 60) {
      return {
        text: "Needs exceed 50% target. Fixed expenses are heavy this month.",
        color: colors.warning,
        icon: "alert-circle-outline",
      };
    }
    if (wantsRatio > 35) {
      return {
        text: "Wants exceed 30% target. Consider moderating discretionary spends.",
        color: colors.danger,
        icon: "information-outline",
      };
    }
    if (savingsRatio >= 20) {
      return {
        text: "Excellent discipline! Meeting the 20% golden savings rule.",
        color: colors.success,
        icon: "check-decagram-outline",
      };
    }
    return {
      text: "Balanced budget. Keep tracking to boost savings rate.",
      color: colors.accent,
      icon: "scale-balance",
    };
  };

  const insight = getHealthInsight();

  return (
    <View style={[styles.card, style]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleWrap}>
          <MaterialCommunityIcons
            name="chart-arc"
            size={20}
            color={colors.accent}
            style={{ marginRight: spacing.xs }}
          />
          <Text style={styles.title}>50 / 30 / 20 Budget Rule</Text>
        </View>
        <View style={styles.infoBadge}>
          <Text style={styles.infoBadgeText}>Health Score</Text>
        </View>
      </View>

      <Text style={styles.desc}>
        Ideal allocation: 50% Needs, 30% Wants, 20% Savings.
      </Text>

      {/* Progress Bars */}
      <View style={styles.barsContainer}>
        {/* Needs (50% target) */}
        <View style={styles.barSection}>
          <View style={styles.barHeader}>
            <View style={styles.labelGroup}>
              <View style={[styles.dot, { backgroundColor: "#0EA5E9" }]} />
              <Text style={styles.barLabel}>Needs</Text>
              <Text style={styles.targetLabel}>Target: 50%</Text>
            </View>
            <View style={styles.amountGroup}>
              <Text style={styles.amountText}>{formatCurrency(needsTotal)}</Text>
              <Text style={[styles.percentText, { color: "#0EA5E9" }]}>
                {needsRatio}%
              </Text>
            </View>
          </View>
          <AnimatedProgressBar
            progress={needsRatio / 100}
            height={7}
            color="#0EA5E9"
          />
        </View>

        {/* Wants (30% target) */}
        <View style={styles.barSection}>
          <View style={styles.barHeader}>
            <View style={styles.labelGroup}>
              <View style={[styles.dot, { backgroundColor: "#8B5CF6" }]} />
              <Text style={styles.barLabel}>Wants</Text>
              <Text style={styles.targetLabel}>Target: 30%</Text>
            </View>
            <View style={styles.amountGroup}>
              <Text style={styles.amountText}>{formatCurrency(wantsTotal)}</Text>
              <Text style={[styles.percentText, { color: "#8B5CF6" }]}>
                {wantsRatio}%
              </Text>
            </View>
          </View>
          <AnimatedProgressBar
            progress={wantsRatio / 100}
            height={7}
            color="#8B5CF6"
          />
        </View>

        {/* Savings (20% target) */}
        <View style={styles.barSection}>
          <View style={styles.barHeader}>
            <View style={styles.labelGroup}>
              <View style={[styles.dot, { backgroundColor: colors.success }]} />
              <Text style={styles.barLabel}>Savings</Text>
              <Text style={styles.targetLabel}>Target: 20%</Text>
            </View>
            <View style={styles.amountGroup}>
              <Text style={styles.amountText}>
                {formatCurrency(Math.max(0, savingsTotal))}
              </Text>
              <Text style={[styles.percentText, { color: colors.success }]}>
                {savingsRatio}%
              </Text>
            </View>
          </View>
          <AnimatedProgressBar
            progress={savingsRatio / 100}
            height={7}
            color={colors.success}
          />
        </View>
      </View>

      {/* Insight banner */}
      <View
        style={[
          styles.insightBanner,
          { backgroundColor: `${insight.color}15`, borderColor: `${insight.color}30` },
        ]}
      >
        <MaterialCommunityIcons
          name={insight.icon as any}
          size={16}
          color={insight.color}
          style={{ marginRight: spacing.xs }}
        />
        <Text style={[styles.insightText, { color: insight.color }]}>
          {insight.text}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  titleWrap: {
    flexDirection: "row",
    alignItems: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  infoBadge: {
    backgroundColor: colors.accentMuted,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  infoBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.accent,
  },
  desc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  barsContainer: {
    gap: spacing.md,
  },
  barSection: {
    gap: 4,
  },
  barHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  labelGroup: {
    flexDirection: "row",
    alignItems: "center",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  barLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textPrimary,
    marginRight: 6,
  },
  targetLabel: {
    fontSize: 11,
    color: colors.textMuted,
  },
  amountGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  amountText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  percentText: {
    fontSize: 13,
    fontWeight: "700",
  },
  insightBanner: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  insightText: {
    fontSize: 12,
    fontWeight: "500",
    flex: 1,
  },
});
