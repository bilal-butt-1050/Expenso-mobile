import React from "react";
import { View, Text, StyleSheet, StyleProp, ViewStyle } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { formatCurrency } from "../utils/currency";

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

  const rawNeeds = Math.min(100, needsRatio);
  const rawWants = Math.min(100 - rawNeeds, wantsRatio);
  const rawSavings = Math.max(0, 100 - rawNeeds - rawWants);

  const getBadge = () => {
    if (needsRatio > 60) {
      return { label: "Needs Heavy", color: colors.warning };
    }
    if (wantsRatio > 35) {
      return { label: "Wants Heavy", color: colors.danger };
    }
    if (savingsRatio >= 20) {
      return { label: "On Track", color: colors.success };
    }
    return { label: "Balanced", color: colors.accent };
  };

  const badge = getBadge();

  return (
    <View style={[styles.card, style]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleWrap}>
          <MaterialCommunityIcons
            name="chart-arc"
            size={18}
            color={colors.accent}
            style={{ marginRight: spacing.xs }}
          />
          <Text style={styles.title}>50 · 30 · 20 Split</Text>
        </View>

        <View style={[styles.badge, { backgroundColor: `${badge.color}1A` }]}>
          <View style={[styles.badgeDot, { backgroundColor: badge.color }]} />
          <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
        </View>
      </View>

      {/* Unified Multi-Segment Progress Track */}
      <View style={styles.track}>
        {rawNeeds > 0 && (
          <View
            style={[
              styles.segment,
              {
                flex: rawNeeds,
                backgroundColor: "#0EA5E9",
              },
            ]}
          />
        )}
        {rawWants > 0 && (
          <View
            style={[
              styles.segment,
              {
                flex: rawWants,
                backgroundColor: "#8B5CF6",
              },
            ]}
          />
        )}
        {rawSavings > 0 && (
          <View
            style={[
              styles.segment,
              {
                flex: rawSavings,
                backgroundColor: colors.success,
              },
            ]}
          />
        )}
      </View>

      {/* 3-Column Stats Row */}
      <View style={styles.statsRow}>
        {/* Needs (50%) */}
        <View style={styles.statCol}>
          <View style={styles.statHeader}>
            <View style={[styles.dot, { backgroundColor: "#0EA5E9" }]} />
            <Text style={styles.statLabel}>Needs</Text>
          </View>
          <Text style={styles.statRatio}>
            {needsRatio}% <Text style={styles.statTarget}>/ 50%</Text>
          </Text>
          <Text style={styles.statAmount} numberOfLines={1}>
            {formatCurrency(needsTotal)}
          </Text>
        </View>

        <View style={styles.colDivider} />

        {/* Wants (30%) */}
        <View style={styles.statCol}>
          <View style={styles.statHeader}>
            <View style={[styles.dot, { backgroundColor: "#8B5CF6" }]} />
            <Text style={styles.statLabel}>Wants</Text>
          </View>
          <Text style={styles.statRatio}>
            {wantsRatio}% <Text style={styles.statTarget}>/ 30%</Text>
          </Text>
          <Text style={styles.statAmount} numberOfLines={1}>
            {formatCurrency(wantsTotal)}
          </Text>
        </View>

        <View style={styles.colDivider} />

        {/* Savings (20%) */}
        <View style={styles.statCol}>
          <View style={styles.statHeader}>
            <View style={[styles.dot, { backgroundColor: colors.success }]} />
            <Text style={styles.statLabel}>Savings</Text>
          </View>
          <Text style={styles.statRatio}>
            {savingsRatio}% <Text style={styles.statTarget}>/ 20%</Text>
          </Text>
          <Text style={styles.statAmount} numberOfLines={1}>
            {formatCurrency(Math.max(0, savingsTotal))}
          </Text>
        </View>
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
    marginBottom: spacing.sm,
  },
  titleWrap: {
    flexDirection: "row",
    alignItems: "center",
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    gap: 5,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  track: {
    flexDirection: "row",
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    backgroundColor: colors.surfaceRaised,
    marginBottom: spacing.md,
    gap: 2,
  },
  segment: {
    height: "100%",
    borderRadius: 4,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statCol: {
    flex: 1,
    alignItems: "center",
  },
  colDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.borderLight,
  },
  statHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
    gap: 5,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  statRatio: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  statTarget: {
    fontSize: 10,
    fontWeight: "500",
    color: colors.textMuted,
  },
  statAmount: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
});
