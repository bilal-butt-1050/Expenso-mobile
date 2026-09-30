import React, { useRef, useEffect } from "react";
import { iconName } from "../utils/icons";
import { useLatest } from "../hooks/useLatest";
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
import Swipeable, { type SwipeableMethods } from "react-native-gesture-handler/ReanimatedSwipeable";
import type { Loan, Transaction } from "../types/models";
import { AnimatedProgressBar } from "./AnimatedProgressBar";
import { formatCurrency } from "../utils/currency";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { hapticDelete, hapticLight } from "../utils/haptics";

const SCREEN_WIDTH = Dimensions.get("window").width;

export interface UnifiedActivityItem {
  id: string;
  rawId: string;
  /** LOAN is a loan record (Loans segment); LOAN_MOVEMENT is one of its ledger movements. */
  type: "EXPENSE" | "INCOME" | "LOAN" | "LOAN_MOVEMENT";
  title: string;
  subtitle?: string;
  amount: number;
  date: string | Date;
  icon: string;
  /**
   * How the amount is signed (R-28): `in` shows +, `out` shows −, and `neutral` shows no sign.
   * Everything to do with a loan is neutral: moving money to or from someone isn't income or
   * spending.
   */
  tone: "in" | "out" | "neutral";
  /** Which side of a loan this row belongs to, for its colour. */
  loanDirection?: Loan["type"];
  /** Loan records only: how much has been paid back (R-29). */
  repayment?: { paid: number; total: number; label: string; status: "open" | "settled" | "overdue" };
  /** The transaction, or the whole loan for rows in the Loans segment. */
  raw: Transaction | Loan;
}

const SIGN: Record<UnifiedActivityItem["tone"], string> = { in: "+", out: "−", neutral: "" };
const SPOKEN_SIGN: Record<UnifiedActivityItem["tone"], string> = { in: "plus ", out: "minus ", neutral: "" };

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
  // Read, not depended on: parents pass a new inline callback on every render.
  const onDeleteAnimFinishRef = useLatest(onDeleteAnimFinish);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const swipeableRef = useRef<SwipeableMethods>(null);

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
  }, [isNewlyAdded, highlightAnim]);

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
        onDeleteAnimFinishRef.current?.();
      });
    }
  }, [isDeleting, deleteAnim, fadeAnim, onDeleteAnimFinishRef]);

  // Revealed by swiping right-to-left, matching Mail, Gmail and every other list.
  const renderRightActions = () => {
    return (
      <View style={styles.rightAction}>
        <View style={styles.deleteIconBubble}>
          <MaterialCommunityIcons name="trash-can-outline" size={22} color="#FFFFFF" />
        </View>
      </View>
    );
  };

  // The library reports the direction the row *moved*: swiping right-to-left to reveal the delete
  // action on the right moves it left. This checked "right", so even once gestures worked the swipe
  // would have opened and deleted nothing.
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
    if (item.loanDirection) {
      return item.loanDirection === "LENT" ? "rgba(96, 165, 250, 0.14)" : "rgba(245, 158, 11, 0.14)";
    }
    const categoryColor = "category" in item.raw ? item.raw.category?.color : undefined;
    if (categoryColor) {
      return `${categoryColor}22`;
    }
    return "rgba(99, 102, 241, 0.14)";
  };

  const getIconColor = () => {
    if (item.type === "INCOME") return colors.success;
    if (item.loanDirection) {
      return item.loanDirection === "LENT" ? "#60A5FA" : colors.warning;
    }
    const categoryColor = "category" in item.raw ? item.raw.category?.color : undefined;
    if (categoryColor) {
      return categoryColor;
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
                outputRange: [0, -(SCREEN_WIDTH + 50)],
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
          renderRightActions={renderRightActions}
          onSwipeableOpen={onSwipeableOpen}
          friction={2}
          rightThreshold={60}
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
              accessibilityLabel={[
                item.title,
                item.subtitle,
                `${SPOKEN_SIGN[item.tone]}${formatCurrency(item.amount)}`,
                item.repayment?.label,
                item.repayment && item.repayment.status !== "open" ? item.repayment.status : undefined,
              ]
                .filter(Boolean)
                .join(", ")}
            >
              <View style={styles.rowMain}>
              {/* Bubbly soft icon circle */}
              <View style={[styles.iconCircle, { backgroundColor: getIconBg() }]}>
                <MaterialCommunityIcons
                  name={iconName(item.icon)}
                  size={20}
                  color={getIconColor()}
                />
              </View>

              {/*
                Title plus the one line that says *which* entry this is. Rows were title-only,
                so every restaurant meal read "Food · Rs 500" and five loans rendered as five
                identical "Lent · Rs 5,000". Uncluttered means fewer elements each carrying
                weight, not dropping the field you opened the screen to read.
              */}
              <View style={styles.rowMiddle}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                {item.subtitle ? (
                  <Text style={styles.rowSubtitle} numberOfLines={1}>
                    {item.subtitle}
                  </Text>
                ) : null}
              </View>

              {/* Amount: signed for income and spending, unsigned for loans (R-28) */}
              <View style={styles.rowEnd}>
                <Text
                  style={[
                    styles.rowAmount,
                    item.tone === "in" ? styles.amountIncome : styles.amountDefault,
                  ]}
                >
                  {SIGN[item.tone]}
                  {formatCurrency(item.amount)}
                </Text>
              </View>
              </View>

              {item.repayment ? (
                <View style={styles.repayment} importantForAccessibility="no-hide-descendants">
                  <AnimatedProgressBar
                    progress={item.repayment.total > 0 ? item.repayment.paid / item.repayment.total : 0}
                    height={6}
                    color={item.repayment.status === "settled" ? colors.success : colors.accent}
                  />
                  <View style={styles.repaymentRow}>
                    <Text style={styles.repaymentText} numberOfLines={1}>
                      {item.repayment.label}
                    </Text>
                    {item.repayment.status !== "open" ? (
                      <Text
                        style={[
                          styles.repaymentStatus,
                          { color: item.repayment.status === "overdue" ? colors.danger : colors.success },
                        ]}
                      >
                        {item.repayment.status === "overdue" ? "Overdue" : "Settled"}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ) : null}
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
  rightAction: {
    flex: 1,
    backgroundColor: colors.danger,
    justifyContent: "center",
    alignItems: "flex-end",
    paddingRight: spacing.lg,
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
  },
  rowMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  repayment: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  repaymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
  },
  repaymentText: {
    ...typography.small,
    color: colors.textSecondary,
    flexShrink: 1,
  },
  repaymentStatus: {
    ...typography.small,
    fontWeight: "700",
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
  rowSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
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
