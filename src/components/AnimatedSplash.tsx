import React, { useEffect, useRef } from "react";
import { Animated, Dimensions, StyleSheet, View } from "react-native";
import { colors } from "../theme/colors";

const { width, height } = Dimensions.get("window");

interface Props {
  /** When true, the splash begins its exit animation and calls onComplete when done. */
  ready: boolean;
  onComplete: () => void;
}

/**
 * Full-screen animated splash overlay.
 *
 * Renders the "expenso" wordmark centered on the app background.
 * On mount, the text fades in and scales up gently.
 * Once `ready` flips to true the text scales up slightly more,
 * then the entire overlay fades out before calling `onComplete`.
 */
export function AnimatedSplash({ ready, onComplete }: Props) {
  // --- entrance animation ---
  const entranceOpacity = useRef(new Animated.Value(0)).current;
  const entranceScale = useRef(new Animated.Value(0.85)).current;

  // --- exit animation ---
  const exitOpacity = useRef(new Animated.Value(1)).current;
  const exitScale = useRef(new Animated.Value(1)).current;

  const hasExited = useRef(false);

  // Entrance: fade-in + scale up
  useEffect(() => {
    Animated.parallel([
      Animated.timing(entranceOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(entranceScale, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, [entranceOpacity, entranceScale]);

  // Exit: once data is ready, pause briefly then fade out
  useEffect(() => {
    if (!ready || hasExited.current) return;
    hasExited.current = true;

    // Extended hold so the user can appreciate the logo before login
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(exitOpacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(exitScale, {
          toValue: 1.08,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onComplete();
      });
    }, 2000); // 2 second delay for better visibility

    return () => clearTimeout(timer);
  }, [ready, exitOpacity, exitScale, onComplete]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.container,
        {
          opacity: Animated.multiply(entranceOpacity, exitOpacity),
        },
      ]}
    >
      <Animated.Text
        style={[
          styles.wordmark,
          {
            transform: [
              { scale: Animated.multiply(entranceScale, exitScale) },
            ],
          },
        ]}
      >
        expenso
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    width,
    height,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  },
  wordmark: {
    fontSize: 38,
    fontWeight: "800",
    color: colors.accent,
    letterSpacing: -1,
  },
});
