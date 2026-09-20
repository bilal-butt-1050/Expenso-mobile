import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from "react-native-reanimated";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/spacing";
import { hapticLight } from "../utils/haptics";

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
  if (!visible) return null;

  const handleLend = () => {
    hapticLight();
    onClose();
    if (onSelectLend) onSelectLend();
    else if (onSelectLoan) onSelectLoan("LENT");
  };

  const handleBorrow = () => {
    hapticLight();
    onClose();
    if (onSelectBorrow) onSelectBorrow();
    else if (onSelectLoan) onSelectLoan("BORROWED");
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          style={styles.backdrop}
        >
          <TouchableWithoutFeedback>
            <Animated.View
              entering={SlideInDown.springify().damping(24).stiffness(220)}
              exiting={SlideOutDown.duration(200)}
              style={[
                styles.sheetContainer,
                { paddingBottom: Math.max(insets.bottom + 12, 28) + spacing.md },
              ]}
            >
              {/* Handle Bar */}
              <View style={styles.handle} />

              <View style={styles.header}>
                <Text style={styles.title}>Add New</Text>
              </View>

              <View style={styles.actionsList}>
                {/* Section: Settled Cashflow */}
                <Text style={styles.sectionHeader}>Cashflow</Text>

                {/* Add Expense */}
                <TouchableOpacity
                  style={styles.actionCard}
                  activeOpacity={0.7}
                  onPress={() => {
                    hapticLight();
                    onClose();
                    onSelectExpense();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Add Expense"
                >
                  <View
                    style={[
                      styles.iconCircle,
                      { backgroundColor: "rgba(239, 68, 68, 0.12)" },
                    ]}
                  >
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
                </TouchableOpacity>

                {/* Log Income */}
                <TouchableOpacity
                  style={styles.actionCard}
                  activeOpacity={0.7}
                  onPress={() => {
                    hapticLight();
                    onClose();
                    onSelectIncome();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Log Income"
                >
                  <View
                    style={[
                      styles.iconCircle,
                      { backgroundColor: "rgba(16, 185, 129, 0.12)" },
                    ]}
                  >
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
                </TouchableOpacity>

                {/* Section: Deferred Obligations */}
                <Text style={[styles.sectionHeader, { marginTop: spacing.xs }]}>
                  Loans & Debts
                </Text>

                {/* Lend */}
                <TouchableOpacity
                  style={styles.actionCard}
                  activeOpacity={0.7}
                  onPress={handleLend}
                  accessibilityRole="button"
                  accessibilityLabel="Lend Money"
                >
                  <View
                    style={[
                      styles.iconCircle,
                      { backgroundColor: "rgba(59, 130, 246, 0.12)" },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="hand-coin-outline"
                      size={22}
                      color="#60A5FA"
                    />
                  </View>
                  <Text style={styles.actionTitle}>Lend Money</Text>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={20}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>

                {/* Borrow */}
                <TouchableOpacity
                  style={styles.actionCard}
                  activeOpacity={0.7}
                  onPress={handleBorrow}
                  accessibilityRole="button"
                  accessibilityLabel="Borrow Money"
                >
                  <View
                    style={[
                      styles.iconCircle,
                      { backgroundColor: "rgba(245, 158, 11, 0.12)" },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="account-cash-outline"
                      size={22}
                      color={colors.warning}
                    />
                  </View>
                  <Text style={styles.actionTitle}>Borrow Money</Text>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={20}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.cancelButton}
                activeOpacity={0.7}
                onPress={() => {
                  hapticLight();
                  onClose();
                }}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
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
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderTopWidth: 1,
    borderColor: colors.borderLight,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginBottom: spacing.md,
  },
  header: {
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  actionsList: {
    gap: spacing.sm + 2,
  },
  sectionHeader: {
    fontSize: 12,
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
    borderRadius: 18,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md + 2,
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
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  cancelButton: {
    marginTop: spacing.md + 4,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textSecondary,
  },
});
