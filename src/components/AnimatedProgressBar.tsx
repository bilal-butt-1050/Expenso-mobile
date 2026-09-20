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
  /** Value between 0 and 1, or percentage (0 to 100). */
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
  // Normalize progress to 0-1
  const normalizedProgress = Math.min(Math.max(progress > 1 ? progress / 100 : progress, 0), 1);
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
  }, [normalizedProgress, isFocused, animateOnFocus]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: `${animatedWidth.value * 100}%`,
    };
  });

  const getBarColor = () => {
    if (color) return color;
    if (autoColor) {
      if (normalizedProgress >= 1) return colors.danger;
      if (normalizedProgress >= 0.85) return colors.warning;
      return colors.accent;
    }
    if (normalizedProgress >= 1) return colors.danger;
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
