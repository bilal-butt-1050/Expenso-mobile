import React, { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../../theme/colors";
import { radius, size, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { elevation } from "../../theme/elevation";
import { dockHeight } from "../../navigation/dock";
import { SnackbarEntry, useSnackbarHost } from "./SnackbarContext";

/** Font scale at which the action stacks under the message instead of beside it (NFR-4). */
const STACK_AT_FONT_SCALE = 1.3;

/**
 * Renders the visible snackbar above the floating quick-add button. Mounted once, inside
 * TabNavigator, so it tracks whether the tabs are showing (a pushed stack screen hides it).
 */
export function SnackbarHost() {
  const { current, setHostActive } = useSnackbarHost();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();

  const [shown, setShown] = useState<SnackbarEntry | null>(null);
  const shownRef = useRef<SnackbarEntry | null>(null);
  const progress = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    setHostActive(isFocused);
  }, [isFocused, setHostActive]);

  useEffect(() => () => setHostActive(false), [setHostActive]);

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((on) => {
        if (!cancelled) setReduceMotion(on);
      })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);

  // Swap messages with an exit-then-enter. The outgoing one stays mounted until its exit finishes
  // (ui-review 7.4). `shownRef` avoids depending on state this effect sets (7.3).
  useEffect(() => {
    if (shownRef.current?.key === current?.key) return;
    let cancelled = false;

    const enter = () => {
      if (cancelled) return;
      shownRef.current = current;
      setShown(current);
      if (current) {
        progress.setValue(0);
        Animated.timing(progress, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }).start();
      }
    };

    if (shownRef.current) {
      Animated.timing(progress, {
        toValue: 0,
        duration: 150,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) enter();
      });
    } else {
      enter();
    }

    return () => {
      cancelled = true;
    };
  }, [current, progress]);

  if (!shown) return null;

  const stacked = fontScale >= STACK_AT_FONT_SCALE;
  const translateY = reduceMotion
    ? 0
    : progress.interpolate({ inputRange: [0, 1], outputRange: [spacing.md, 0] });

  return (
    <Animated.View
      // The message is announced explicitly on show; this keeps TalkBack from reading it twice.
      accessibilityLiveRegion="none"
      style={[
        styles.bar,
        stacked && styles.barStacked,
        {
          left: spacing.lg + insets.left,
          right: spacing.lg + insets.right,
          bottom: dockHeight(insets.bottom) + spacing.md + size.fab + spacing.sm,
          opacity: progress,
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={[styles.messageRow, stacked && styles.messageRowStacked]}>
        {shown.icon ? (
          <MaterialCommunityIcons
            name={shown.icon}
            size={20}
            color={shown.iconColor ?? colors.warning}
            style={styles.icon}
          />
        ) : null}
        <Text style={styles.message} numberOfLines={3}>
          {shown.text}
        </Text>
      </View>
      {shown.action ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={shown.action.a11yLabel}
          onPress={shown.action.onPress}
          style={({ pressed }) => [styles.action, stacked && styles.actionStacked, pressed && styles.actionPressed]}
        >
          <Text style={styles.actionLabel}>{shown.action.label}</Text>
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    minHeight: size.minTouch,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    ...elevation.floating,
  },
  barStacked: { flexDirection: "column", alignItems: "stretch" },
  messageRow: { flex: 1, flexDirection: "row", alignItems: "center" },
  // In a column with no fixed height, flex: 1 would size the row from a zero basis.
  messageRowStacked: { flex: 0 },
  icon: { marginRight: spacing.sm },
  message: { ...typography.caption, color: colors.textPrimary, flex: 1 },
  action: {
    minHeight: size.minTouch,
    minWidth: size.minTouch,
    paddingHorizontal: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: spacing.sm,
  },
  actionStacked: { alignSelf: "flex-end", marginLeft: 0 },
  actionPressed: { opacity: 0.85 },
  actionLabel: { ...typography.body, fontWeight: "700", color: colors.accentText },
});
