import React, { useEffect } from "react";
import { View, StyleSheet, StyleProp, ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { colors } from "../theme/colors";
import { radius } from "../theme/spacing";

interface AnimatedProgressBarProps {
  /** Value between 0 and 1, or percentage (0 to 100). */
  progress: number;
  height?: number;
  color?: string;
  backgroundColor?: string;
  autoColor?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function AnimatedProgressBar({
  progress,
  height = 8,
  color,
  backgroundColor = "rgba(255, 255, 255, 0.08)",
  autoColor = false,
  style,
}: AnimatedProgressBarProps) {
  // Normalize progress to 0-1
  const normalizedProgress = Math.min(Math.max(progress > 1 ? progress / 100 : progress, 0), 1);
  const animatedWidth = useSharedValue(0);

  useEffect(() => {
    animatedWidth.value = withSpring(normalizedProgress, {
      damping: 18,
      stiffness: 120,
    });
  }, [normalizedProgress]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: `${animatedWidth.value * 100}%`,
    };
  });

  const getBarColor = () => {
    if (color) return color;
    if (!autoColor) return colors.accent;
    if (normalizedProgress >= 1) return colors.danger;
    if (normalizedProgress >= 0.8) return colors.warning;
    return colors.success;
  };

  return (
    <View style={[styles.track, { height, backgroundColor }, style]}>
      <Animated.View
        style={[
          styles.fill,
          { height, backgroundColor: getBarColor() },
          animatedStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: "100%",
    borderRadius: radius.pill,
    overflow: "hidden",
  },
  fill: {
    borderRadius: radius.pill,
  },
});
