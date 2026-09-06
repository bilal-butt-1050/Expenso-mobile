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
export function PieChart({ data, size = 180 }: Props) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const radius = size / 2 - 14;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let offset = 0;

  return (
    <View style={styles.row}>
      <Svg width={size} height={size}>
        <G rotation={-90} origin={`${center}, ${center}`}>
          {total === 0 ? (
            <Circle cx={center} cy={center} r={radius} stroke={colors.surfaceRaised} strokeWidth={20} fill="none" />
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
                  strokeWidth={20}
                  strokeDasharray={`${dash} ${circumference - dash}`}
                  strokeDashoffset={-offset}
                  strokeLinecap="butt"
                  fill="none"
                />
              );
              offset += dash;
              return circle;
            })
          )}
        </G>
      </Svg>

      <View style={styles.legend}>
        {data.length === 0 ? (
          <Text style={styles.legendEmpty}>No spending yet this month</Text>
        ) : (
          data.slice(0, 6).map((slice) => (
            <View key={slice.label} style={styles.legendRow}>
              <View style={[styles.dot, { backgroundColor: slice.color }]} />
              <Text style={styles.legendLabel} numberOfLines={1}>
                {slice.label}
              </Text>
              <Text style={styles.legendValue}>{formatCurrency(slice.value)}</Text>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  legend: { flex: 1, gap: spacing.sm },
  legendRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { flex: 1, color: colors.textSecondary, fontSize: 12 },
  legendValue: { color: colors.textPrimary, fontSize: 12, fontWeight: "700" },
  legendEmpty: { color: colors.textMuted, fontSize: 12 },
});
