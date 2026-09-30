import React, { useEffect } from "react";
import { View, StyleSheet, StyleProp, ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { useIsFocused } from "@react-navigation/native";
import { colors } from "../theme/colors";
import { radius } from "../theme/spacing";

interface AnimatedProgressBarProps {
  /**
   * A ratio: 0 is empty, 1 is full, and above 1 is over (drawn full). It used to also accept a
   * percentage, guessed from `> 1`, so 120% of a budget (1.2) was read as 1.2% and the bar went
   * back to nearly empty instead of filling red (R-32).
   */
  progress: number;
  height?: number;
  color?: string;
  backgroundColor?: string;
  autoColor?: boolean;
  animateOnFocus?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function AnimatedProgressBar({
  progress,
  height = 8,
  color,
  backgroundColor = "rgba(255, 255, 255, 0.08)",
  autoColor = false,
  animateOnFocus = true,
  style,
}: AnimatedProgressBarProps) {
  const isOver = progress > 1;
  const normalizedProgress = Math.min(Math.max(progress, 0), 1);
  const isFocused = useIsFocused();
  const animatedWidth = useSharedValue(0);

  useEffect(() => {
    if (!animateOnFocus || isFocused) {
      animatedWidth.value = 0;
      animatedWidth.value = withSpring(normalizedProgress, {
        damping: 18,
        stiffness: 110,
        mass: 0.7,
      });
    } else {
      animatedWidth.value = 0;
    }
  }, [normalizedProgress, isFocused, animateOnFocus, animatedWidth]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: `${animatedWidth.value * 100}%`,
    };
  });

  const getBarColor = () => {
    if (color) return color;
    if (isOver) return colors.danger;
    if (autoColor && normalizedProgress >= 0.85) return colors.warning;
    return colors.accent;
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
