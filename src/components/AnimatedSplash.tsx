import React, { useCallback, useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text } from "react-native";
import { colors } from "../theme/colors";

interface Props {
  /** True once auth restore and the initial navigation state have settled. */
  ready: boolean;
  /** Called once the exit animation has fully completed. */
  onComplete: () => void;
}

/**
 * Brand splash shown over the navigator while auth is restored.
 *
 * The background matches the native splash exactly, so the native-to-JS handoff is invisible.
 *
 * Timing is driven by `ready`, not by a fixed duration: the wordmark settles quickly and the
 * splash leaves as soon as the app is actually usable, with a short floor so a fast cold start
 * doesn't flash. Transforms are deliberately small — an oversized scale forces the compositor to
 * rasterize a huge layer during the exact window when the JS thread is busy parsing the bundle
 * and restoring the session, which is what made this stutter.
 */

/** Wordmark settle. */
const INTRO_MS = 420;
/** Fade-out. */
const EXIT_MS = 280;
/** Floor before we're allowed to leave, so a warm start doesn't flash. */
const MIN_VISIBLE_MS = 620;
/** Hard ceiling — the app must never hang on the splash. */
const SAFETY_MS = 4000;

export function AnimatedSplash({ ready, onComplete }: Props) {
  const intro = useRef(new Animated.Value(0)).current;
  const exitOpacity = useRef(new Animated.Value(1)).current;

  const hasExited = useRef(false);
  const mountedAt = useRef(Date.now());
  const readyRef = useRef(ready);
  readyRef.current = ready;

  const triggerExit = useCallback(() => {
    if (hasExited.current) return;
    hasExited.current = true;

    Animated.timing(exitOpacity, {
      toValue: 0,
      duration: EXIT_MS,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) onComplete();
    });
  }, [exitOpacity, onComplete]);

  /** Leave now if ready, otherwise wait out the remaining floor and re-check. */
  const exitWhenAllowed = useCallback(() => {
    if (hasExited.current || !readyRef.current) return;
    const elapsed = Date.now() - mountedAt.current;
    if (elapsed >= MIN_VISIBLE_MS) {
      triggerExit();
    } else {
      setTimeout(triggerExit, MIN_VISIBLE_MS - elapsed);
    }
  }, [triggerExit]);

  // Intro: a small settle, cheap to composite.
  useEffect(() => {
    Animated.timing(intro, {
      toValue: 1,
      duration: INTRO_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(exitWhenAllowed);

    const safety = setTimeout(triggerExit, SAFETY_MS);
    return () => clearTimeout(safety);
  }, [intro, exitWhenAllowed, triggerExit]);

  // Auth may settle after the intro has already finished.
  useEffect(() => {
    if (ready) exitWhenAllowed();
  }, [ready, exitWhenAllowed]);

  return (
    <Animated.View pointerEvents="none" style={[styles.container, { opacity: exitOpacity }]}>
      <Animated.Text
        style={[
          styles.wordmark,
          {
            opacity: intro.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
            transform: [
              { scale: intro.interpolate({ inputRange: [0, 1], outputRange: [1.06, 1] }) },
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
    ...(StyleSheet.absoluteFill as object),
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  },
  wordmark: {
    fontSize: 48,
    fontWeight: "800",
    color: colors.accent,
    letterSpacing: -1.2,
  },
});
