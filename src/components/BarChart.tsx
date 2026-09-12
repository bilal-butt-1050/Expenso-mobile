import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Rect } from "react-native-svg";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { formatMonthShort } from "../utils/date";

interface Point {
  month: string;
  value: number;
}

interface Props {
  data: Point[];
  height?: number;
}

export function BarChart({ data, height = 140 }: Props) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const barWidth = 18;
  const gap = 10;
  const width = data.length * (barWidth + gap);
  const chartHeight = height - 24;

  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={width} height={height}>
        {data.map((point, i) => {
          const isLatest = i === data.length - 1;
          const barHeight = Math.max((point.value / max) * chartHeight, point.value > 0 ? 4 : 0);
          // To center the 18px bar inside the 28px column, offset it by (gap/2)
          const x = i * (barWidth + gap) + gap / 2;
          const y = chartHeight - barHeight;
          return (
            <React.Fragment key={point.month}>
              {/* Background Guide Track */}
              <Rect
                x={x}
                y={0}
                width={barWidth}
                height={chartHeight}
                rx={6}
                fill="rgba(255, 255, 255, 0.04)"
              />
              {/* Actual Spending Bar */}
              {barHeight > 0 && (
                <Rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  rx={6}
                  fill={isLatest ? colors.accent : "rgba(255, 255, 255, 0.25)"}
                />
              )}
            </React.Fragment>
          );
        })}
      </Svg>
      <View style={[styles.labels, { width }]}>
        {data.map((point, i) => {
          const isLatest = i === data.length - 1;
          return (
            <Text
              key={point.month}
              style={[
                styles.label,
                isLatest && { color: colors.accent, fontWeight: "700" },
              ]}
              numberOfLines={1}
            >
              {i % 2 === 0 || isLatest ? formatMonthShort(point.month) : ""}
            </Text>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  labels: { flexDirection: "row", marginTop: spacing.sm },
  label: { width: 28, fontSize: 11, color: colors.textSecondary, fontWeight: "600", textAlign: "center" },
});
