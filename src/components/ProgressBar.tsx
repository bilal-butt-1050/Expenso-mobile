import React from "react";
import { StyleSheet, View } from "react-native";
import { colors } from "../theme/colors";
import { radius } from "../theme/spacing";

interface Props {
  progress: number; // 0..1+ (values over 1 indicate overspending)
  color?: string;
  height?: number;
}

export function ProgressBar({ progress, color, height = 8 }: Props) {
  const clamped = Math.min(Math.max(progress, 0), 1);
  const isOver = progress > 1;
  const barColor = color ?? (isOver ? colors.danger : colors.accent);

  return (
    <View style={[styles.track, { height, borderRadius: height / 2 }]}>
      <View
        style={{
          width: `${clamped * 100}%`,
          height: "100%",
          backgroundColor: barColor,
          borderRadius: height / 2,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: "100%",
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.pill,
    overflow: "hidden",
  },
});
