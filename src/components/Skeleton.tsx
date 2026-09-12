import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View, ViewStyle } from "react-native";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/spacing";

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

/**
 * Animated shimmer skeleton block.
 * Uses a pulsing opacity animation for a smooth, modern loading feel.
 */
export function Skeleton({ width = "100%", height = 20, borderRadius: br = 8, style }: SkeletonProps) {
  const pulse = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.35, duration: 800, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius: br,
          backgroundColor: colors.surfaceRaised,
          opacity: pulse,
        },
        style,
      ]}
    />
  );
}

/** Skeleton for a single list row (icon + two lines + amount) */
export function SkeletonRow() {
  return (
    <View style={rowStyles.row}>
      <Skeleton width={42} height={42} borderRadius={21} />
      <View style={rowStyles.middle}>
        <Skeleton width="65%" height={16} />
        <Skeleton width="40%" height={12} style={{ marginTop: 6 }} />
      </View>
      <View style={rowStyles.end}>
        <Skeleton width={72} height={16} />
        <Skeleton width={52} height={20} borderRadius={10} style={{ marginTop: 6 }} />
      </View>
    </View>
  );
}

/** Skeleton for a full list (hero + N rows) */
export function SkeletonList({ rows = 5 }: { rows?: number }) {
  return (
    <View style={listStyles.container}>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </View>
  );
}

/** Skeleton for the HomeScreen dashboard */
export function HomeSkeleton() {
  return (
    <View style={homeStyles.container}>
      {/* Income Hero */}
      <View style={homeStyles.hero}>
        <Skeleton width={80} height={14} />
        <Skeleton width={200} height={40} borderRadius={6} style={{ marginTop: 8 }} />
        <Skeleton width={160} height={14} style={{ marginTop: 8 }} />
      </View>

      {/* Expenses Panel */}
      <View style={homeStyles.panel}>
        <View style={homeStyles.panelCol}>
          <Skeleton width={40} height={12} />
          <Skeleton width={70} height={20} style={{ marginTop: 6 }} />
        </View>
        <View style={homeStyles.panelCol}>
          <Skeleton width={35} height={12} />
          <Skeleton width={70} height={20} style={{ marginTop: 6 }} />
        </View>
        <View style={homeStyles.panelCol}>
          <Skeleton width={45} height={12} />
          <Skeleton width={70} height={20} style={{ marginTop: 6 }} />
        </View>
      </View>

      {/* Balance Card */}
      <View style={homeStyles.balanceCard}>
        <Skeleton width={130} height={14} />
        <Skeleton width={180} height={36} borderRadius={6} style={{ marginTop: 10 }} />
        <Skeleton width="100%" height={5} borderRadius={3} style={{ marginTop: 10 }} />
      </View>

      {/* Chart placeholder */}
      <Skeleton width={120} height={18} style={{ marginTop: spacing.lg }} />
      <View style={homeStyles.chartCard}>
        <Skeleton width="100%" height={160} borderRadius={12} />
      </View>
    </View>
  );
}

/** Skeleton for the Income/Expenses hero + list */
export function ListScreenSkeleton() {
  return (
    <View style={listScreenStyles.container}>
      {/* Hero */}
      <View style={listScreenStyles.hero}>
        <Skeleton width={60} height={12} />
        <Skeleton width={180} height={36} borderRadius={6} style={{ marginTop: 8 }} />
      </View>

      {/* Filters */}
      <View style={listScreenStyles.filters}>
        <Skeleton width={60} height={36} borderRadius={18} />
        <Skeleton width={80} height={36} borderRadius={18} />
        <Skeleton width={80} height={36} borderRadius={18} />
      </View>

      {/* Rows */}
      <SkeletonList rows={6} />
    </View>
  );
}

/** Skeleton for Budget screen */
export function BudgetSkeleton() {
  return (
    <View style={budgetStyles.container}>
      {/* Summary */}
      <View style={budgetStyles.summary}>
        <View style={{ flex: 1 }}>
          <Skeleton width={70} height={12} />
          <Skeleton width={100} height={24} style={{ marginTop: 6 }} />
        </View>
        <View style={{ flex: 1 }}>
          <Skeleton width={60} height={12} />
          <Skeleton width={100} height={24} style={{ marginTop: 6 }} />
        </View>
      </View>

      <Skeleton width={100} height={18} style={{ marginTop: spacing.lg }} />

      {/* Category rows */}
      {Array.from({ length: 5 }).map((_, i) => (
        <View key={i} style={budgetStyles.row}>
          <Skeleton width={38} height={38} borderRadius={19} />
          <View style={{ flex: 1 }}>
            <Skeleton width="55%" height={16} />
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Skeleton width={72} height={16} />
            <Skeleton width={52} height={12} style={{ marginTop: 4 }} />
          </View>
        </View>
      ))}
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  middle: { flex: 1 },
  end: { alignItems: "flex-end" },
});

const listStyles = StyleSheet.create({
  container: { paddingHorizontal: spacing.lg },
});

const homeStyles = StyleSheet.create({
  container: { gap: spacing.md },
  hero: { alignItems: "center", paddingVertical: spacing.lg },
  panel: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    justifyContent: "space-around",
  },
  panelCol: { alignItems: "center", gap: 4 },
  balanceCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  chartCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginTop: spacing.sm,
  },
});

const listScreenStyles = StyleSheet.create({
  container: {},
  hero: { alignItems: "center", paddingVertical: spacing.sm },
  filters: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.sm,
    marginVertical: spacing.sm,
  },
});

const budgetStyles = StyleSheet.create({
  container: {},
  summary: {
    flexDirection: "row",
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
});
