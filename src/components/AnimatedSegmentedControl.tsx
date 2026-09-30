import React, { useEffect, useRef, useState } from "react";
import { iconName } from "../utils/icons";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StyleProp,
  ViewStyle,
  LayoutChangeEvent,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import { radius, size, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { hapticLight } from "../utils/haptics";

/** Gap between the track's edge and the sliding indicator; the indicator's width maths uses it. */
const INSET = 4;

export interface SegmentOption<T extends string = string> {
  label: string;
  value: T;
  icon?: string;
  badge?: number | string;
}

interface AnimatedSegmentedControlProps<T extends string = string> {
  options: SegmentOption<T>[];
  selected: T;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
}

export function AnimatedSegmentedControl<T extends string = string>({
  options,
  selected,
  onChange,
  style,
}: AnimatedSegmentedControlProps<T>) {
  const [containerWidth, setContainerWidth] = useState(0);
  const isMeasuredRef = useRef(false);

  const selectedIndex = options.findIndex((opt) => opt.value === selected);
  const activeIndex = selectedIndex >= 0 ? selectedIndex : 0;

  const segmentWidth = containerWidth > 0 ? (containerWidth - 2 * INSET) / options.length : 0;
  const translateX = useSharedValue(0);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) {
      const sw = (w - 2 * INSET) / options.length;
      if (!isMeasuredRef.current) {
        isMeasuredRef.current = true;
        // Snap immediately to active index on initial layout (no lame fly-in from 0)
        translateX.value = activeIndex * sw;
      }
      setContainerWidth(w);
    }
  };

  // Sync external changes (e.g. route parameters or programmatic reset)
  useEffect(() => {
    if (isMeasuredRef.current && segmentWidth > 0) {
      translateX.value = withSpring(activeIndex * segmentWidth, {
        damping: 24,
        stiffness: 260,
        mass: 0.7,
      });
    }
  }, [activeIndex, segmentWidth, translateX]);

  // Buttery smooth Reanimated UI-thread transform
  const indicatorStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
      width: segmentWidth,
    };
  });

  const handlePress = (value: T, index: number) => {
    if (value === selected) return;
    hapticLight();
    // Instantly animate on the UI thread at tap time with zero JS lag
    if (segmentWidth > 0) {
      translateX.value = withSpring(index * segmentWidth, {
        damping: 24,
        stiffness: 260,
        mass: 0.7,
      });
    }
    onChange(value);
  };

  return (
    <View style={[styles.container, style]} onLayout={onLayout} accessibilityRole="tablist">
      {segmentWidth > 0 && (
        <Animated.View style={[styles.indicator, indicatorStyle]} />
      )}
      {options.map((opt, index) => {
        const isSelected = opt.value === selected;
        return (
          <TouchableOpacity
            key={opt.value}
            style={styles.segment}
            activeOpacity={0.7}
            onPress={() => handlePress(opt.value, index)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
          >
            <View style={styles.segmentContent}>
              {opt.icon && (
                <MaterialCommunityIcons
                  name={iconName(opt.icon)}
                  size={16}
                  color={isSelected ? colors.textPrimary : colors.textMuted}
                  style={styles.icon}
                />
              )}
              <Text
                style={[
                  styles.label,
                  isSelected ? styles.labelActive : styles.labelInactive,
                ]}
                numberOfLines={1}
              >
                {opt.label}
              </Text>
              {opt.badge !== undefined && (
                <View
                  style={[
                    styles.badge,
                    isSelected ? styles.badgeActive : styles.badgeInactive,
                  ]}
                >
                  <Text style={styles.badgeText}>{opt.badge}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.pill,
    padding: INSET,
    position: "relative",
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: "hidden",
  },
  // The app's one selection style, as on the chips and the month grid (W6).
  indicator: {
    position: "absolute",
    top: INSET,
    bottom: INSET,
    left: INSET,
    backgroundColor: colors.accentMuted,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radius.pill,
  },
  segment: {
    flex: 1,
    minHeight: size.minTouch,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  segmentContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    marginRight: spacing.xs,
  },
  label: {
    ...typography.small,
    letterSpacing: -0.1,
  },
  labelActive: {
    color: colors.textPrimary,
    fontWeight: "700",
  },
  labelInactive: {
    color: colors.textSecondary,
  },
  badge: {
    marginLeft: spacing.xs,
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
    borderRadius: radius.pill,
  },
  badgeActive: {
    backgroundColor: colors.iconBorder,
  },
  badgeInactive: {
    backgroundColor: colors.borderLight,
  },
  badgeText: {
    ...typography.small,
    fontWeight: "700",
    color: colors.textPrimary,
  },
});
