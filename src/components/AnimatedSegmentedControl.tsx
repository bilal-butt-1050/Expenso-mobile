import React, { useEffect } from "react";
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
import { radius, spacing } from "../theme/spacing";
import { hapticLight } from "../utils/haptics";

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
  const [containerWidth, setContainerWidth] = React.useState(0);
  const selectedIndex = options.findIndex((opt) => opt.value === selected);
  const activeIndex = selectedIndex >= 0 ? selectedIndex : 0;

  const segmentWidth = containerWidth > 0 ? (containerWidth - 6) / options.length : 0;
  const maxTranslate = Math.max(0, (options.length - 1) * segmentWidth);
  const translateX = useSharedValue(0);

  useEffect(() => {
    if (segmentWidth > 0) {
      translateX.value = withSpring(activeIndex * segmentWidth, {
        damping: 19,
        stiffness: 190,
      });
    }
  }, [activeIndex, segmentWidth]);

  const indicatorStyle = useAnimatedStyle(() => {
    // Natural elastic boundary: never bleeds outside the container edge
    const clampedPos = Math.max(0, Math.min(translateX.value, maxTranslate));
    return {
      transform: [{ translateX: clampedPos }],
      width: segmentWidth,
    };
  });

  const onLayout = (e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  };

  return (
    <View style={[styles.container, style]} onLayout={onLayout}>
      {segmentWidth > 0 && (
        <Animated.View style={[styles.indicator, indicatorStyle]} />
      )}
      {options.map((opt) => {
        const isSelected = opt.value === selected;
        return (
          <TouchableOpacity
            key={opt.value}
            style={styles.segment}
            activeOpacity={0.7}
            onPress={() => {
              if (!isSelected) {
                hapticLight();
                onChange(opt.value);
              }
            }}
          >
            <View style={styles.segmentContent}>
              {opt.icon && (
                <MaterialCommunityIcons
                  name={opt.icon as any}
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
    borderRadius: radius.md,
    padding: 3,
    position: "relative",
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: "hidden",
  },
  indicator: {
    position: "absolute",
    top: 3,
    bottom: 3,
    left: 3,
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  segment: {
    flex: 1,
    paddingVertical: spacing.sm,
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
    marginRight: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
  },
  labelActive: {
    color: colors.textPrimary,
  },
  labelInactive: {
    color: colors.textSecondary,
  },
  badge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.pill,
  },
  badgeActive: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  badgeInactive: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.textPrimary,
  },
});
