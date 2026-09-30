import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback,
  PanResponder,
} from "react-native";
import { PressableScale } from "./PressableScale";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { hapticLight } from "../utils/haptics";
import { useRegisterOverlay } from "../lib/overlays";
import { useLatest } from "../hooks/useLatest";

interface QuickActionSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelectExpense: () => void;
  onSelectIncome: () => void;
  onSelectLend: () => void;
  onSelectBorrow: () => void;
  onSelectLoan?: (type?: "LENT" | "BORROWED") => void;
}

export function QuickActionSheet({
  visible,
  onClose,
  onSelectExpense,
  onSelectIncome,
  onSelectLend,
  onSelectBorrow,
  onSelectLoan,
}: QuickActionSheetProps) {
  const insets = useSafeAreaInsets();
  const [modalVisible, setModalVisible] = useState(visible);
  useRegisterOverlay(modalVisible);
  const isClosingRef = useRef(false);
  // Read inside the open/close effect without re-running it: modalVisible is state that effect sets,
  // and dismissSheet is a new function every render.
  const modalVisibleRef = useLatest(modalVisible);
  const dismissSheetRef = useRef<(callback?: () => void) => void>(() => {});

  const translateY = useSharedValue(600);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      isClosingRef.current = false;
      setModalVisible(true);
      translateY.value = 600;
      backdropOpacity.value = 0;
      translateY.value = withSpring(0, {
        damping: 24,
        stiffness: 240,
        mass: 0.8,
      });
      backdropOpacity.value = withTiming(1, { duration: 200 });
    } else if (modalVisibleRef.current && !isClosingRef.current) {
      dismissSheetRef.current();
    }
  }, [visible, translateY, backdropOpacity, modalVisibleRef, dismissSheetRef]);

  const finalizeClose = (callback?: () => void) => {
    isClosingRef.current = false;
    setModalVisible(false);
    onClose();
    if (callback) {
      callback();
    }
  };

  const dismissSheet = (callback?: () => void) => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    backdropOpacity.value = withTiming(0, { duration: 180 });
    translateY.value = withTiming(650, { duration: 200 }, (finished) => {
      if (finished) {
        runOnJS(finalizeClose)(callback);
      }
    });
  };

  // Assigned every render, so the effect above always calls the current dismissSheet.
  dismissSheetRef.current = dismissSheet;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 5,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.value = gestureState.dy;
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 70 || gestureState.vy > 0.5) {
          dismissSheet();
        } else {
          translateY.value = withSpring(0, { damping: 22, stiffness: 260 });
        }
      },
    })
  ).current;

  const animatedSheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const animatedBackdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  if (!modalVisible && !visible) return null;

  const handleLend = () => {
    hapticLight();
    dismissSheet(() => {
      if (onSelectLend) onSelectLend();
      else if (onSelectLoan) onSelectLoan("LENT");
    });
  };

  const handleBorrow = () => {
    hapticLight();
    dismissSheet(() => {
      if (onSelectBorrow) onSelectBorrow();
      else if (onSelectLoan) onSelectLoan("BORROWED");
    });
  };

  return (
    <Modal
      transparent
      visible={modalVisible}
      animationType="none"
      onRequestClose={() => dismissSheet()}
    >
      {/* Neither touchable is a screen-reader stop: each would group the whole sheet into one
          unlabelled element. Back closes the sheet (W14). */}
      <TouchableWithoutFeedback onPress={() => dismissSheet()} accessible={false}>
        <Animated.View style={[styles.backdrop, animatedBackdropStyle]}>
          <TouchableWithoutFeedback accessible={false}>
            <Animated.View
              style={[
                styles.sheetContainer,
                animatedSheetStyle,
                { paddingBottom: Math.max(insets.bottom + spacing.sm, spacing.xl) + spacing.md },
              ]}
            >
              {/* Draggable Handle Header Area */}
              <View style={styles.dragHandleArea} {...panResponder.panHandlers}>
                <View style={styles.handle} />
                <View style={styles.header}>
                  <Text style={styles.title} accessibilityRole="header">
                    Add new
                  </Text>
                </View>
              </View>

              <View style={styles.actionsList}>
                {/* Section: Settled Cashflow */}
                <Text style={styles.sectionHeader}>Cashflow</Text>

                {/* Add Expense */}
                <PressableScale
                  style={styles.actionCard}
                  onPress={() => {
                    hapticLight();
                    dismissSheet(() => onSelectExpense());
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Add expense"
                >
                  <View style={[styles.iconCircle, { backgroundColor: colors.dangerMuted }]}>
                    <MaterialCommunityIcons
                      name="arrow-down"
                      size={22}
                      color={colors.danger}
                    />
                  </View>
                  <Text style={styles.actionTitle}>Expense</Text>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={20}
                    color={colors.textMuted}
                  />
                </PressableScale>

                {/* Add Income */}
                <PressableScale
                  style={styles.actionCard}
                  onPress={() => {
                    hapticLight();
                    dismissSheet(() => onSelectIncome());
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Add income"
                >
                  <View style={[styles.iconCircle, { backgroundColor: colors.successMuted }]}>
                    <MaterialCommunityIcons
                      name="arrow-up"
                      size={22}
                      color={colors.success}
                    />
                  </View>
                  <Text style={styles.actionTitle}>Income</Text>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={20}
                    color={colors.textMuted}
                  />
                </PressableScale>

                {/* Section: Deferred Obligations */}
                <Text style={[styles.sectionHeader, { marginTop: spacing.xs }]}>
                  Loans & debts
                </Text>

                {/* Lend */}
                <PressableScale
                  style={styles.actionCard}
                  onPress={handleLend}
                  accessibilityRole="button"
                  accessibilityLabel="Lend money"
                >
                  {/* One colour per loan direction (D-59, W4). */}
                  <View style={[styles.iconCircle, { backgroundColor: colors.lentMuted }]}>
                    <MaterialCommunityIcons
                      name="hand-coin-outline"
                      size={22}
                      color={colors.lent}
                    />
                  </View>
                  <Text style={styles.actionTitle}>Lend money</Text>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={20}
                    color={colors.textMuted}
                  />
                </PressableScale>

                {/* Borrow */}
                <PressableScale
                  style={styles.actionCard}
                  onPress={handleBorrow}
                  accessibilityRole="button"
                  accessibilityLabel="Borrow money"
                >
                  <View style={[styles.iconCircle, { backgroundColor: colors.borrowedMuted }]}>
                    <MaterialCommunityIcons
                      name="account-cash-outline"
                      size={22}
                      color={colors.borrowed}
                    />
                  </View>
                  <Text style={styles.actionTitle}>Borrow money</Text>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={20}
                    color={colors.textMuted}
                  />
                </PressableScale>
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.scrim,
    justifyContent: "flex-end",
  },
  sheetContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingHorizontal: spacing.lg,
    borderTopWidth: 1,
    borderColor: colors.borderLight,
  },
  dragHandleArea: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    alignItems: "center",
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },
  header: {
    alignItems: "center",
    marginBottom: spacing.md,
  },
  title: {
    ...typography.subtitle,
    fontWeight: "700",
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  actionsList: {
    gap: spacing.sm + 2,
  },
  sectionHeader: {
    ...typography.small,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: colors.textMuted,
    marginLeft: spacing.xs,
  },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  actionTitle: {
    ...typography.body,
    flex: 1,
    fontWeight: "600",
    color: colors.textPrimary,
  },
});
