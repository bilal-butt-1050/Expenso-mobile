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
import { MoneyText } from "./MoneyText";
import { formatCurrency } from "../utils/currency";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { hapticDelete, hapticLight } from "../utils/haptics";
import { useReduceMotion } from "../hooks/useReduceMotion";

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
/** The swipe's alternative for screen readers (W11): TalkBack lists it in the row's actions. */
const A11Y_ACTIONS = [{ name: "delete", label: "Delete" }];

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
  // Reduced motion (W3b). A dependency, not a ref: the setting resolves after mount, and re-running
  // the highlight then swaps its fade for the instant version.
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    if (isNewlyAdded) {
      Animated.sequence([
        Animated.timing(highlightAnim, {
          toValue: 1,
          duration: 0,
          useNativeDriver: false,
        }),
        // Reduced motion: the highlight holds for the same time, then goes at once, not a fade.
        Animated.timing(highlightAnim, {
          toValue: 0,
          duration: reduceMotion ? 0 : 2200,
          delay: reduceMotion ? 2600 : 400,
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [isNewlyAdded, highlightAnim, reduceMotion]);

  useEffect(() => {
    if (isDeleting) {
      const fade = Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      });
      // Reduced motion: the row fades out in place, with no slide or shrink.
      (reduceMotion
        ? fade
        : Animated.parallel([
            Animated.timing(deleteAnim, {
              toValue: 1,
              duration: 250,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            fade,
          ])
      ).start(() => {
        onDeleteAnimFinishRef.current?.();
      });
    }
  }, [isDeleting, deleteAnim, fadeAnim, onDeleteAnimFinishRef, reduceMotion]);

  // Revealed by swiping right-to-left, matching Mail, Gmail and every other list.
  const renderRightActions = () => {
    return (
      <View style={styles.rightAction}>
        <View style={styles.deleteIconBubble}>
          <MaterialCommunityIcons name="trash-can-outline" size={22} color={colors.accentForeground} />
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

  // Expenses are red and income green, icon and amount alike, so a row's colour always means the
  // same thing (D-59). Categories are still told apart by their icon.
  const getIconBg = () => {
    if (item.type === "INCOME") return colors.successMuted;
    if (item.type === "EXPENSE") return colors.dangerMuted;
    if (item.loanDirection) {
      return item.loanDirection === "LENT" ? colors.lentMuted : colors.borrowedMuted;
    }
    return colors.accentMuted;
  };

  const getIconColor = () => {
    if (item.type === "INCOME") return colors.success;
    if (item.type === "EXPENSE") return colors.danger;
    if (item.loanDirection) {
      return item.loanDirection === "LENT" ? colors.lent : colors.borrowed;
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
          containerStyle={styles.swipeContainer}
        >
          <Animated.View
            style={[
              styles.row,
              {
                backgroundColor: highlightAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [colors.surfaceRaised, colors.highlight],
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
              accessibilityActions={A11Y_ACTIONS}
              onAccessibilityAction={(e) => {
                if (e.nativeEvent.actionName === "delete") onDelete();
              }}
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
                <MoneyText
                  amount={item.amount}
                  prefix={SIGN[item.tone]}
                  style={[
                    styles.rowAmount,
                    item.tone === "in"
                      ? styles.amountIncome
                      : item.tone === "out"
                        ? styles.amountExpense
                        : styles.amountDefault,
                  ]}
                />
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
    marginBottom: spacing.sm,
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  rightAction: {
    flex: 1,
    backgroundColor: colors.danger,
    justifyContent: "center",
    alignItems: "flex-end",
    paddingRight: spacing.lg,
    borderRadius: radius.lg,
  },
  swipeContainer: {
    borderRadius: radius.lg,
  },
  deleteIconBubble: {
    width: 38,
    height: 38,
    borderRadius: 19,
    // A white wash on the red delete action; no token is meant for "on danger".
    // eslint-disable-next-line no-restricted-syntax
    backgroundColor: "rgba(255, 255, 255, 0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.lg,
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
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  rowSubtitle: {
    ...typography.small,
    fontWeight: "400",
    color: colors.textMuted,
  },
  rowEnd: {
    alignItems: "flex-end",
    justifyContent: "center",
  },
  rowAmount: {
    ...typography.body,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  amountDefault: {
    color: colors.textPrimary,
  },
  amountIncome: {
    color: colors.success,
  },
  // Spending in red with its minus sign, mirroring income's green + (D-58).
  amountExpense: {
    color: colors.danger,
  },
});
