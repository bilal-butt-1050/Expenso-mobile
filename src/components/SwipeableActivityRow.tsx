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
  subtitle: string;
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
      Animated.timing(deleteAnim, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        if (onDeleteAnimFinish) onDeleteAnimFinish();
      });
    }
  }, [isDeleting]);

  const renderRightActions = () => {
    return (
      <View style={styles.rightAction}>
        <MaterialCommunityIcons name="trash-can-outline" size={24} color="#FFFFFF" />
      </View>
    );
  };

  const onSwipeableOpen = (direction: "left" | "right") => {
    if (direction === "right") {
      hapticDelete();
      swipeableRef.current?.close();
      onDelete();
    }
  };

  return (
    <View style={styles.container}>
      <Animated.View
        style={{
          transform: [
            {
              translateX: deleteAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -SCREEN_WIDTH],
              }),
            },
          ],
        }}
      >
        <Swipeable
          ref={swipeableRef}
          renderRightActions={renderRightActions}
          onSwipeableOpen={onSwipeableOpen}
          friction={2}
          rightThreshold={60}
          containerStyle={{ borderRadius: 18 }}
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
              <View style={styles.iconCircle}>
                <MaterialCommunityIcons
                  name={item.icon as any}
                  size={20}
                  color={colors.textPrimary}
                />
              </View>

              <View style={styles.rowMiddle}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.rowSub} numberOfLines={1}>
                  {item.subtitle}
                </Text>
              </View>

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
    marginBottom: 8,
    borderRadius: 18,
    overflow: "hidden",
  },
  rightAction: {
    flex: 1,
    backgroundColor: colors.danger,
    justifyContent: "center",
    alignItems: "flex-end",
    paddingRight: 24,
    borderRadius: 18,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surfaceRaised,
    borderRadius: 18,
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  rowMiddle: { flex: 1 },
  rowTitle: { ...typography.body, fontWeight: "600", fontSize: 16 },
  rowSub: { ...typography.caption, color: colors.textMuted, marginTop: 2, fontSize: 13 },
  rowEnd: { alignItems: "flex-end", justifyContent: "center" },
  rowAmount: { fontSize: 17, fontWeight: "700" },
  amountDefault: { color: colors.textPrimary },
  amountIncome: { color: colors.success },
});
