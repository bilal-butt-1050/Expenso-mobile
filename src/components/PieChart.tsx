import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, G } from "react-native-svg";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { formatCurrency } from "../utils/currency";

interface Slice {
  label: string;
  value: number;
  color: string;
}

interface Props {
  data: Slice[];
  size?: number;
}

// A donut chart built from stroked circle segments — react-native-svg is
// the one graphics dependency the whole app needs, so there's no risk of
// a heavier charting library breaking on a future Expo SDK bump.
export function PieChart({ data, size = 150 }: Props) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let offset = 0;

  return (
    <View style={styles.container}>
      {/* Centered Donut Ring with Total in the Center */}
      <View style={styles.chartWrapper}>
        <Svg width={size} height={size}>
          <G rotation={-90} origin={`${center}, ${center}`}>
            {total === 0 ? (
              <Circle
                cx={center}
                cy={center}
                r={radius}
                stroke={colors.surfaceRaised}
                strokeWidth={strokeWidth}
                fill="none"
              />
            ) : (
              data.map((slice) => {
                const fraction = slice.value / total;
                const dash = fraction * circumference;
                const circle = (
                  <Circle
                    key={slice.label}
                    cx={center}
                    cy={center}
                    r={radius}
                    stroke={slice.color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${dash} ${circumference - dash}`}
                    strokeDashoffset={-offset}
                    strokeLinecap="round"
                    fill="none"
                  />
                );
                offset += dash;
                return circle;
              })
            )}
          </G>
        </Svg>
        <View style={styles.centerTextContainer}>
          <Text style={styles.centerLabel}>Total</Text>
          <Text style={styles.centerAmount} numberOfLines={1} adjustsFontSizeToFit>
            {formatCurrency(total)}
          </Text>
        </View>
      </View>

      {/* Full-width spacious Category Breakdown List */}
      <View style={styles.list}>
        {data.length === 0 ? (
          <Text style={styles.legendEmpty}>No spending logged for this month</Text>
        ) : (
          data.map((slice) => {
            const percentage = total > 0 ? Math.round((slice.value / total) * 100) : 0;
            return (
              <View key={slice.label} style={styles.categoryRow}>
                <View style={styles.categoryLeft}>
                  <View style={[styles.dot, { backgroundColor: slice.color }]} />
                  <Text style={styles.categoryName}>{slice.label}</Text>
                  <View style={styles.percentBadge}>
                    <Text style={styles.percentText}>{percentage}%</Text>
                  </View>
                </View>
                <Text style={styles.categoryAmount}>{formatCurrency(slice.value)}</Text>
              </View>
            );
          })
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    width: "100%",
  },
  chartWrapper: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: spacing.sm,
  },
  centerTextContainer: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
  },
  centerLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  centerAmount: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "800",
    marginTop: 2,
  },
  list: {
    width: "100%",
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + "55",
  },
  categoryLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
    paddingRight: spacing.sm,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  categoryName: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "600",
    flexShrink: 1,
  },
  percentBadge: {
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  percentText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  categoryAmount: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
  legendEmpty: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: "center",
    paddingVertical: spacing.md,
  },
});
