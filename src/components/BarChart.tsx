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

  return (
    <View>
      <Svg width={width} height={height}>
        {data.map((point, i) => {
          const barHeight = Math.max((point.value / max) * (height - 24), point.value > 0 ? 3 : 0);
          const x = i * (barWidth + gap);
          const y = height - 24 - barHeight;
          return (
            <Rect
              key={point.month}
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              rx={4}
              fill={i === data.length - 1 ? colors.accent : colors.accentMuted}
            />
          );
        })}
      </Svg>
      <View style={[styles.labels, { width }]}>
        {data.map((point, i) => (
          <Text key={point.month} style={styles.label} numberOfLines={1}>
            {i % 2 === 0 ? formatMonthShort(point.month) : ""}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  labels: { flexDirection: "row", marginTop: spacing.xs },
  label: { width: 28, fontSize: 11, color: colors.textSecondary, fontWeight: "600", textAlign: "center" },
});
