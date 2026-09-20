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
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from "react-native-reanimated";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { hapticLight } from "../utils/haptics";

interface QuickActionSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelectExpense: () => void;
  onSelectIncome: () => void;
  onSelectLoan: () => void;
}

export function QuickActionSheet({
  visible,
  onClose,
  onSelectExpense,
  onSelectIncome,
  onSelectLoan,
}: QuickActionSheetProps) {
  if (!visible) return null;

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
              entering={SlideInDown.springify().damping(22).stiffness(200)}
              exiting={SlideOutDown.duration(200)}
              style={styles.sheetContainer}
            >
              {/* Handle Bar */}
              <View style={styles.handle} />

              <View style={styles.header}>
                <Text style={styles.title}>Quick Action</Text>
                <Text style={styles.subtitle}>
                  Select what you want to log
                </Text>
              </View>

              <View style={styles.actionsList}>
                {/* Add Expense */}
                <TouchableOpacity
                  style={styles.actionCard}
                  activeOpacity={0.75}
                  onPress={() => {
                    hapticLight();
                    onClose();
                    onSelectExpense();
                  }}
                >
                  <View
                    style={[
                      styles.iconCircle,
                      { backgroundColor: colors.dangerMuted },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="arrow-down"
                      size={24}
                      color={colors.danger}
                    />
                  </View>
                  <View style={styles.actionInfo}>
                    <Text style={styles.actionTitle}>Add Expense</Text>
                    <Text style={styles.actionDesc}>
                      Track an outflow, category, and paid status
                    </Text>
                  </View>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={20}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>

                {/* Log Income */}
                <TouchableOpacity
                  style={styles.actionCard}
                  activeOpacity={0.75}
                  onPress={() => {
                    hapticLight();
                    onClose();
                    onSelectIncome();
                  }}
                >
                  <View
                    style={[
                      styles.iconCircle,
                      { backgroundColor: colors.successMuted },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="arrow-up"
                      size={24}
                      color={colors.success}
                    />
                  </View>
                  <View style={styles.actionInfo}>
                    <Text style={styles.actionTitle}>Log Income</Text>
                    <Text style={styles.actionDesc}>
                      Record salary, freelance, bonus, or investment
                    </Text>
                  </View>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={20}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>

                {/* Record Loan */}
                <TouchableOpacity
                  style={styles.actionCard}
                  activeOpacity={0.75}
                  onPress={() => {
                    hapticLight();
                    onClose();
                    onSelectLoan();
                  }}
                >
                  <View
                    style={[
                      styles.iconCircle,
                      { backgroundColor: colors.warningMuted },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="hand-coin-outline"
                      size={24}
                      color={colors.warning}
                    />
                  </View>
                  <View style={styles.actionInfo}>
                    <Text style={styles.actionTitle}>Record Loan</Text>
                    <Text style={styles.actionDesc}>
                      Track money lent to someone or borrowed
                    </Text>
                  </View>
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
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    borderTopWidth: 1,
    borderColor: colors.borderLight,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginBottom: spacing.md,
  },
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  actionsList: {
    gap: spacing.md,
  },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  actionInfo: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  actionDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  cancelButton: {
    marginTop: spacing.lg,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textSecondary,
  },
});
