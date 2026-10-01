import React, { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import Animated, {
  Easing,
  ReduceMotion,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { colors, darkColors } from "../theme/colors";

interface Props {
  /** True once auth restore and the initial navigation state have settled. */
  ready: boolean;
  /** Called once the exit animation has fully completed. */
  onComplete: () => void;
}

/**
 * Brand splash shown over the navigator while auth is restored.
 *
 * The native splash is the bare brand background (a transparent image in app.json), and this
 * starts on that same background with the wordmark invisible, so the handoff shows nothing. The
 * wordmark then fades in large and zooms out to its resting size, holds, and the splash fades away.
 * It leaves only once the navigator is `ready` and the zoom has finished; a late `ready` holds the
 * final frame (Bilal asked for an unhurried splash, over ui-review 7.2's "no floor").
 *
 * Everything runs on the UI thread (Reanimated), so a busy JS thread at startup can't stutter it.
 * Ui-review 7.1: the zoom starts at a moderate 3x, not the old 40x. The text is laid out at the
 * large size and scaled *down*, so the hardware layer is rasterized once, crisp, and the GPU only
 * shrinks it. Scaling a small layer up would blur it.
 */

/** The resting wordmark size: a logo, not text on the type ramp. */
const WORDMARK_SIZE = 48;
/** How far zoomed in the wordmark starts: about the screen width. */
const ZOOM_FROM = 3;
const FADE_IN_MS = 400;
const ZOOM_MS = 1400;
/** The pause on the settled wordmark before the splash fades. */
const HOLD_MS = 300;
const EXIT_MS = 300;

export function AnimatedSplash({ ready, onComplete }: Props) {
  // Read synchronously at app start, which is exactly when this mounts.
  const reduceMotion = useReducedMotion();

  const scale = useSharedValue(reduceMotion ? 1 / ZOOM_FROM : 1);
  const wordOpacity = useSharedValue(0);
  const splashOpacity = useSharedValue(1);

  const started = useRef(false);
  const exiting = useRef(false);
  const [introDoneAt, setIntroDoneAt] = useState<number | null>(null);

  const finishIntro = useCallback(() => setIntroDoneAt(Date.now()), []);

  // On first layout, not on mount: the native splash hides only once this view exists natively, so
  // there's no frame without it, and the animation starts where the user can see it.
  const start = useCallback(() => {
    if (started.current) return;
    started.current = true;
    SplashScreen.hideAsync().catch(() => {});

    const onIntroEnd = (finished?: boolean) => {
      "worklet";
      if (finished) runOnJS(finishIntro)();
    };
    // `Never`: with reduce motion on, Reanimated would otherwise jump straight to the end. The fade
    // is the reduced-motion version, so it always plays.
    wordOpacity.value = withTiming(
      1,
      { duration: FADE_IN_MS, easing: Easing.out(Easing.quad), reduceMotion: ReduceMotion.Never },
      reduceMotion ? onIntroEnd : undefined,
    );
    if (!reduceMotion) {
      scale.value = withTiming(1 / ZOOM_FROM, { duration: ZOOM_MS, easing: Easing.out(Easing.cubic) }, onIntroEnd);
    }
  }, [finishIntro, reduceMotion, scale, wordOpacity]);

  useEffect(() => {
    if (!ready || introDoneAt === null || exiting.current) return;
    exiting.current = true;
    // The hold counts from the end of the intro, so a late `ready` doesn't add it again.
    const hold = Math.max(0, HOLD_MS - (Date.now() - introDoneAt));
    splashOpacity.value = withDelay(
      hold,
      withTiming(
        0,
        { duration: EXIT_MS, easing: Easing.inOut(Easing.quad), reduceMotion: ReduceMotion.Never },
        (finished) => {
          if (finished) runOnJS(onComplete)();
        },
      ),
      ReduceMotion.Never,
    );
  }, [ready, introDoneAt, onComplete, splashOpacity]);

  const splashStyle = useAnimatedStyle(() => ({ opacity: splashOpacity.value }));
  const wordStyle = useAnimatedStyle(() => ({
    opacity: wordOpacity.value,
    transform: [{ scale: scale.value }],
  }));

  // A cached layer only while it's scaling. At rest the text is drawn directly, crisp, instead of
  // as a texture shrunk 3x.
  const rasterize = !reduceMotion && introDoneAt === null;

  return (
    <Animated.View pointerEvents="none" style={[styles.container, splashStyle]} onLayout={start}>
      <View style={styles.stage}>
        <Animated.View
          collapsable={false}
          renderToHardwareTextureAndroid={rasterize}
          shouldRasterizeIOS={rasterize}
          style={wordStyle}
        >
          {/* Fixed size: it's a logo, and at 200% font the large layout would break the word. */}
          <Text allowFontScaling={false} style={styles.wordmark}>
            expenso
          </Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...(StyleSheet.absoluteFill as object),
    // Same colour as the native splash (app.json `expo-splash-screen` backgroundColor).
    backgroundColor: darkColors.background,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  },
  // Wider than the screen, so the zoomed-in word lays out on one line and overflows both edges.
  stage: {
    width: `${ZOOM_FROM * 100}%`,
    alignItems: "center",
  },
  wordmark: {
    fontSize: WORDMARK_SIZE * ZOOM_FROM,
    fontWeight: "800",
    color: colors.accent,
    letterSpacing: -1.2 * ZOOM_FROM,
  },
});
