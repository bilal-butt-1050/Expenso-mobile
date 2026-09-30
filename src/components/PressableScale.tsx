import React, { useRef } from "react";
import { Animated, GestureResponderEvent, Pressable, PressableProps, StyleProp, ViewStyle } from "react-native";
import { useReduceMotion } from "../hooks/useReduceMotion";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface Props extends Omit<PressableProps, "style"> {
  style?: StyleProp<ViewStyle>;
  /** How far it gives way while pressed. */
  scaleTo?: number;
}

/**
 * The app's tap feedback: the control gives way a little under the finger and springs back on
 * release. Native-driven, so it stays smooth while JS is busy. Still under reduced motion.
 */
export function PressableScale({ style, scaleTo = 0.97, onPressIn, onPressOut, ...props }: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const reduceMotion = useReduceMotion();

  const springTo = (toValue: number, bounciness: number) => {
    if (reduceMotion) return;
    Animated.spring(scale, { toValue, useNativeDriver: true, speed: 40, bounciness }).start();
  };

  return (
    <AnimatedPressable
      {...props}
      onPressIn={(e: GestureResponderEvent) => {
        springTo(scaleTo, 0);
        onPressIn?.(e);
      }}
      onPressOut={(e: GestureResponderEvent) => {
        springTo(1, 6);
        onPressOut?.(e);
      }}
      style={[style, { transform: [{ scale }] }]}
    />
  );
}
