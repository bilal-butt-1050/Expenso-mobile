import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  StyleSheet,
  Text,
} from "react-native";
import { colors } from "../theme/colors";

const { width, height } = Dimensions.get("window");

interface Props {
  /** When true, auth/init check has finished. */
  ready: boolean;
  /** Called once the exit animation fully completes. */
  onComplete: () => void;
}

/**
 * Premium splash screen launcher.
 *
 * - Zero-flicker: Opaque from frame 1.
 * - Displays only the "expenso" wordmark in brand purple.
 * - Transition: Starts massively zoomed in (filling the screen), smoothly zooms out.
 * - Resilient: Free of stale closures with a max safety timer so the app never hangs.
 */
export function AnimatedSplash({ ready, onComplete }: Props) {
  // Zoom animation: starts massively zoomed in (40x), zooms out to resting center (1.0x)
  const zoomAnim = useRef(new Animated.Value(40)).current;
  const exitOpacity = useRef(new Animated.Value(1)).current;

  const isReadyRef = useRef(ready);
  isReadyRef.current = ready;

  const introDone = useRef(false);
  const hasExited = useRef(false);

  const triggerExit = () => {
    if (hasExited.current) return;
    hasExited.current = true;

    Animated.parallel([
      Animated.timing(exitOpacity, {
        toValue: 0,
        duration: 350,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(zoomAnim, {
        toValue: 1.05,
        duration: 350,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start(() => {
      onComplete();
    });
  };

  useEffect(() => {
    // 1. Entrance Zoom-Out Animation
    Animated.timing(zoomAnim, {
      toValue: 1.0,
      duration: 800,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      useNativeDriver: true,
    }).start(() => {
      introDone.current = true;
      if (isReadyRef.current) {
        triggerExit();
      }
    });

    // 2. Safety timeout: guarantees the app never hangs on splash screen
    const safetyTimer = setTimeout(() => {
      triggerExit();
    }, 2000);

    return () => {
      clearTimeout(safetyTimer);
    };
  }, []);

  // Exit trigger if ready flips to true after the intro zoom completes
  useEffect(() => {
    if (ready && introDone.current) {
      triggerExit();
    }
  }, [ready]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.container,
        {
          opacity: exitOpacity,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.centerWrap,
          {
            transform: [
              // Offset slightly so that the massive zoom feels centered on the 'p'
              { translateX: zoomAnim.interpolate({ inputRange: [1, 40], outputRange: [0, 40] }) },
              { scale: zoomAnim }
            ],
          },
        ]}
      >
        <Text style={styles.wordmark}>expenso</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...(StyleSheet.absoluteFill as object),
    width,
    height,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  },
  centerWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  wordmark: {
    fontSize: 48,
    fontWeight: "800",
    color: colors.accent,
    letterSpacing: -1.2,
  },
});
