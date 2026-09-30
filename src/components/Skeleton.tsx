import React, { useEffect, useRef } from "react";
import { Animated, DimensionValue, StyleSheet, View, ViewStyle } from "react-native";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/spacing";
import { useReduceMotion } from "../hooks/useReduceMotion";

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

/**
 * Animated shimmer skeleton block.
 * Uses a pulsing opacity animation for a smooth, modern loading feel. With reduced motion on, it
 * holds still at a mid opacity instead (W3b).
 */
export function Skeleton({ width = "100%", height = 20, borderRadius: br = 8, style }: SkeletonProps) {
  const pulse = useRef(new Animated.Value(0.35)).current;
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    if (reduceMotion) {
      pulse.setValue(0.5);
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.35, duration: 800, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulse, reduceMotion]);

  return (
    <Animated.View
      style={[
        {
          width,
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
        <Skeleton width="40%" height={12} style={{ marginTop: spacing.xs }} />
      </View>
      <View style={rowStyles.end}>
        <Skeleton width={72} height={16} />
        <Skeleton width={52} height={20} borderRadius={10} style={{ marginTop: spacing.xs }} />
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

/** Skeleton for the HomeScreen dashboard: Home v3's shape (DESIGN S11). */
export function HomeSkeleton() {
  // The hero figure, then the month summary, spending and budgets cards.
  return (
    <View style={homeStyles.container} accessibilityLabel="Loading your figures">
      <View style={homeStyles.hero}>
        <Skeleton width={120} height={15} />
        <Skeleton width={200} height={32} borderRadius={radius.sm} />
      </View>

      <View style={homeStyles.card}>
        <View style={homeStyles.twoCol}>
          <Skeleton width="45%" height={44} borderRadius={radius.sm} />
          <Skeleton width="45%" height={44} borderRadius={radius.sm} />
        </View>
        <Skeleton width="100%" height={18} />
      </View>

      <View style={homeStyles.card}>
        <Skeleton width={100} height={17} />
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} width="100%" height={22} />
        ))}
      </View>

      <View style={homeStyles.card}>
        <Skeleton width={90} height={17} />
        <Skeleton width="100%" height={36} />
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
        <Skeleton width={180} height={36} borderRadius={6} style={{ marginTop: spacing.sm }} />
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
          <Skeleton width={100} height={24} style={{ marginTop: spacing.xs }} />
        </View>
        <View style={{ flex: 1 }}>
          <Skeleton width={60} height={12} />
          <Skeleton width={100} height={24} style={{ marginTop: spacing.xs }} />
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
            <Skeleton width={52} height={12} style={{ marginTop: spacing.xs }} />
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
  hero: {
    alignItems: "center",
    gap: spacing.xs,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  card: {
    gap: spacing.md,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surface,
  },
  twoCol: { flexDirection: "row", justifyContent: "space-between" },
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
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
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
