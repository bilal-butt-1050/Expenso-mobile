import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  StyleSheet,
  Text,
  View,
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
 * Premium, cinematic splash screen launcher.
 *
 * - Zero-flicker: Opaque from frame 1, seamlessly handing off from native splash.
 * - Displays the bold Expenso emblem (scaled up) and elegant brand typography.
 * - Features a calm, subtle ambient breathing effect on the logo.
 * - Features a minimalist linear progress indicator at the bottom.
 * - Delivers a polished ~5.4 second launch experience before smoothly fading out.
 */
export function AnimatedSplash({ ready, onComplete }: Props) {
  const exitOpacity = useRef(new Animated.Value(1)).current;
  const exitScale = useRef(new Animated.Value(1)).current;
  const breathAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  const minTimePassed = useRef(false);
  const hasExited = useRef(false);

  const triggerExit = () => {
    if (hasExited.current) return;
    hasExited.current = true;

    Animated.parallel([
      Animated.timing(exitOpacity, {
        toValue: 0,
        duration: 600,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(exitScale, {
        toValue: 1.06,
        duration: 600,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start(() => {
      onComplete();
    });
  };

  useEffect(() => {
    // 1. Subtle, high-end ambient breathing pulse on the logo emblem
    const breathLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathAnim, {
          toValue: 1.035,
          duration: 2200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(breathAnim, {
          toValue: 1.0,
          duration: 2200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    breathLoop.start();

    // 2. Smooth, steady progress line fill across 4.8s
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 4800,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      useNativeDriver: false,
    }).start();

    // 3. Minimum display timer: hold for ~4.8s so user enjoys the full launcher experience
    const timer = setTimeout(() => {
      minTimePassed.current = true;
      if (ready) {
        triggerExit();
      }
    }, 4800);

    return () => {
      breathLoop.stop();
      clearTimeout(timer);
    };
  }, []);

  // Exit trigger if ready becomes true after the 4.8s display window
  useEffect(() => {
    if (ready && minTimePassed.current) {
      triggerExit();
    }
  }, [ready]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 140],
  });

  const combinedScale = Animated.multiply(breathAnim, exitScale);

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
            transform: [{ scale: combinedScale }],
          },
        ]}
      >
        {/* Ambient Glow */}
        <View style={styles.glow} />

        {/* Large Logo Emblem */}
        <View style={styles.iconContainer}>
          <Image
            source={require("../../assets/icon.jpg")}
            style={styles.logoImage}
            resizeMode="cover"
          />
        </View>

        {/* Wordmark */}
        <Text style={styles.wordmark}>
          expenso<Text style={styles.accentDot}>.</Text>
        </Text>

        {/* Tagline */}
        <Text style={styles.tagline}>Know where every rupee goes.</Text>
      </Animated.View>

      {/* Sleek Minimalist Progress Bar at Bottom */}
      <View style={styles.bottomWrap}>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressBar, { width: progressWidth }]} />
        </View>
      </View>
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
  glow: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(99, 102, 241, 0.14)",
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    backgroundColor: colors.surface,
    elevation: 8,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
  },
  logoImage: {
    width: "100%",
    height: "100%",
  },
  wordmark: {
    fontSize: 42,
    fontWeight: "800",
    color: colors.textPrimary,
    letterSpacing: -1.2,
    marginTop: 20,
  },
  accentDot: {
    color: colors.accent,
  },
  tagline: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textSecondary,
    marginTop: 6,
    letterSpacing: 0.4,
  },
  bottomWrap: {
    position: "absolute",
    bottom: 54,
    alignItems: "center",
  },
  progressTrack: {
    width: 140,
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: colors.accent,
    borderRadius: 2,
  },
});
