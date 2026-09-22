import React, { useRef, useEffect } from "react";
import {
  Animated,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Easing,
  Dimensions,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Swipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import { formatCurrency } from "../utils/currency";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { hapticDelete, hapticLight } from "../utils/haptics";

const SCREEN_WIDTH = Dimensions.get("window").width;

export interface UnifiedActivityItem {
  id: string;
  rawId: string;
  type: "EXPENSE" | "INCOME" | "LOAN";
  title: string;
  subtitle?: string;
  amount: number;
  date: string | Date;
  icon: string;
  isIncome?: boolean;
  isSettled?: boolean;
  raw: any;
}

interface SwipeableActivityRowProps {
  item: UnifiedActivityItem;
  isNewlyAdded?: boolean;
  isDeleting?: boolean;
  onPress: () => void;
  onDeleteAnimFinish?: () => void;
  onDelete: () => void;
}

export function SwipeableActivityRow({
  item,
  isNewlyAdded,
  isDeleting,
  onPress,
  onDeleteAnimFinish,
  onDelete,
}: SwipeableActivityRowProps) {
  const highlightAnim = useRef(new Animated.Value(isNewlyAdded ? 1 : 0)).current;
  const deleteAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const swipeableRef = useRef<any>(null);

  useEffect(() => {
    if (isNewlyAdded) {
      Animated.sequence([
        Animated.timing(highlightAnim, {
          toValue: 1,
          duration: 0,
          useNativeDriver: false,
        }),
        Animated.timing(highlightAnim, {
          toValue: 0,
          duration: 2200,
          delay: 400,
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [isNewlyAdded]);

  useEffect(() => {
    if (isDeleting) {
      Animated.parallel([
        Animated.timing(deleteAnim, {
          toValue: 1,
          duration: 250,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (onDeleteAnimFinish) onDeleteAnimFinish();
      });
    }
  }, [isDeleting]);

  // Smooth bubbly left action revealed when swiping left-to-right
  const renderLeftActions = () => {
    return (
      <View style={styles.leftAction}>
        <View style={styles.deleteIconBubble}>
          <MaterialCommunityIcons name="trash-can-outline" size={22} color="#FFFFFF" />
        </View>
      </View>
    );
  };

  const onSwipeableOpen = (direction: "left" | "right") => {
    if (direction === "left") {
      hapticDelete();
      swipeableRef.current?.close();
      onDelete();
    }
  };

  // Vibrant, friendly icon colors & soft background bubbles
  const getIconBg = () => {
    if (item.type === "INCOME") return "rgba(16, 185, 129, 0.14)";
    if (item.type === "LOAN") {
      return item.raw?.type === "LENT"
        ? "rgba(96, 165, 250, 0.14)"
        : "rgba(245, 158, 11, 0.14)";
    }
    if (item.raw?.category?.color) {
      return `${item.raw.category.color}22`;
    }
    return "rgba(99, 102, 241, 0.14)";
  };

  const getIconColor = () => {
    if (item.type === "INCOME") return colors.success;
    if (item.type === "LOAN") {
      return item.raw?.type === "LENT" ? "#60A5FA" : colors.warning;
    }
    if (item.raw?.category?.color) {
      return item.raw.category.color;
    }
    return colors.accent;
  };

  return (
    <View style={styles.container}>
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [
            {
              translateX: deleteAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, SCREEN_WIDTH + 50],
              }),
            },
            {
              scale: deleteAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 0.9],
              }),
            },
          ],
        }}
      >
        <Swipeable
          ref={swipeableRef}
          renderLeftActions={renderLeftActions}
          onSwipeableOpen={onSwipeableOpen}
          friction={2}
          leftThreshold={60}
          containerStyle={{ borderRadius: 22 }}
        >
          <Animated.View
            style={[
              styles.row,
              {
                backgroundColor: highlightAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [colors.surfaceRaised, "rgba(99, 102, 241, 0.22)"],
                }),
              },
            ]}
          >
            <TouchableOpacity
              style={styles.rowTouchArea}
              onPress={() => {
                hapticLight();
                onPress();
              }}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`${item.title}, ${formatCurrency(item.amount)}`}
            >
              {/* Bubbly soft icon circle */}
              <View style={[styles.iconCircle, { backgroundColor: getIconBg() }]}>
                <MaterialCommunityIcons
                  name={item.icon as any}
                  size={20}
                  color={getIconColor()}
                />
              </View>

              {/* Title only (clean, minimal, comfy — no descriptions) */}
              <View style={styles.rowMiddle}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {item.title}
                </Text>
              </View>

              {/* Amount */}
              <View style={styles.rowEnd}>
                <Text
                  style={[
                    styles.rowAmount,
                    item.isIncome ? styles.amountIncome : styles.amountDefault,
                  ]}
                >
                  {item.isIncome ? "+" : ""}
                  {formatCurrency(item.amount)}
                </Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </Swipeable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
    borderRadius: 22,
    overflow: "hidden",
  },
  leftAction: {
    flex: 1,
    backgroundColor: colors.danger,
    justifyContent: "center",
    alignItems: "flex-start",
    paddingLeft: spacing.lg,
    borderRadius: 22,
  },
  deleteIconBubble: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255, 255, 255, 0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surfaceRaised,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  rowTouchArea: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  rowMiddle: {
    flex: 1,
    justifyContent: "center",
  },
  rowTitle: {
    ...typography.body,
    fontWeight: "600",
    fontSize: 16,
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  rowEnd: {
    alignItems: "flex-end",
    justifyContent: "center",
  },
  rowAmount: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  amountDefault: {
    color: colors.textPrimary,
  },
  amountIncome: {
    color: colors.success,
  },
});
