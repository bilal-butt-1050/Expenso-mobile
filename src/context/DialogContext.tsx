import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { Animated, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRegisterOverlay } from "../lib/overlays";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import { radius, size, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useReduceMotion } from "../hooks/useReduceMotion";

export interface ConfirmOptions {
  title: string;
  message?: string;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

export interface AlertOptions {
  title: string;
  message?: string;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  buttonText?: string;
  onDismiss?: () => void;
}

interface DialogContextValue {
  confirm: (options: ConfirmOptions) => void;
  alert: (options: AlertOptions) => void;
}

const DialogContext = createContext<DialogContextValue | null>(null);

type DialogState =
  | { type: "none" }
  | ({ type: "confirm" } & ConfirmOptions)
  | ({ type: "alert" } & AlertOptions);

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [dialogState, setDialogState] = useState<DialogState>({ type: "none" });
  useRegisterOverlay(dialogState.type !== "none");
  // Reduced motion: the dialog fades in place instead of also scaling up (W3b).
  const reduceMotion = useReduceMotion();

  const modalAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (dialogState.type !== "none") {
      Animated.timing(modalAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    } else {
      modalAnim.setValue(0);
    }
  }, [dialogState.type, modalAnim]);

  const confirm = useCallback((options: ConfirmOptions) => {
    setDialogState({ type: "confirm", ...options });
  }, []);

  const alert = useCallback((options: AlertOptions) => {
    setDialogState({ type: "alert", ...options });
  }, []);

  const handleCancel = () => {
    if (dialogState.type === "confirm" && dialogState.onCancel) {
      dialogState.onCancel();
    }
    closeDialog();
  };

  const handleConfirm = async () => {
    if (dialogState.type === "confirm") {
      const fn = dialogState.onConfirm;
      closeDialog();
      await fn();
    }
  };

  const handleDismiss = () => {
    if (dialogState.type === "alert" && dialogState.onDismiss) {
      dialogState.onDismiss();
    }
    closeDialog();
  };

  const closeDialog = () => {
    Animated.timing(modalAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setDialogState({ type: "none" });
    });
  };

  const isModalOpen = dialogState.type !== "none";
  const isDestructive =
    dialogState.type === "confirm" ? Boolean(dialogState.destructive) : false;
  const dialogIcon =
    dialogState.type !== "none"
      ? dialogState.icon ||
        (isDestructive
          ? "trash-can-outline"
          : dialogState.type === "confirm"
          ? "help-circle-outline"
          : "information-outline")
      : undefined;

  return (
    <DialogContext.Provider value={{ confirm, alert }}>
      {children}

      {/* Themed Custom Modal Dialog */}
      <Modal
        transparent
        visible={isModalOpen}
        animationType="none"
        onRequestClose={dialogState.type === "confirm" ? handleCancel : handleDismiss}
        statusBarTranslucent
      >
        <Animated.View
          style={[
            styles.backdrop,
            { paddingBottom: Math.max(insets.bottom, spacing.lg), opacity: modalAnim },
          ]}
        >
          {/* The scrim is a sibling behind the card, so a tap on the card never reaches it. It's
              hidden from screen readers: every dialog has its own Cancel / dismiss button, and Back
              closes it too. (A TouchableWithoutFeedback wrapping the card made the whole dialog
              one accessible blob.) */}
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={dialogState.type === "confirm" ? handleCancel : handleDismiss}
            accessible={false}
            importantForAccessibility="no"
          />
          <Animated.View
            style={[
              styles.dialogCard,
              !reduceMotion && {
                transform: [
                  { scale: modalAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) },
                ],
              },
            ]}
          >
            {dialogIcon && (
              <View
                style={[
                  styles.iconCircle,
                  isDestructive ? styles.iconCircleDanger : styles.iconCircleAccent,
                ]}
              >
                <MaterialCommunityIcons
                  name={dialogIcon}
                  size={26}
                  color={isDestructive ? colors.danger : colors.accent}
                />
              </View>
            )}

            {dialogState.type !== "none" && (
              <>
                <Text style={styles.dialogTitle}>{dialogState.title}</Text>
                {dialogState.message ? (
                  <Text style={styles.dialogMessage}>{dialogState.message}</Text>
                ) : null}

                {dialogState.type === "confirm" ? (
                  <View style={styles.buttonRow}>
                    <TouchableOpacity
                      style={styles.cancelBtn}
                      onPress={handleCancel}
                      activeOpacity={0.8}
                      accessibilityRole="button"
                    >
                      <Text style={styles.cancelBtnText}>
                        {dialogState.cancelText || "Cancel"}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.confirmBtn,
                        isDestructive ? styles.confirmBtnDanger : styles.confirmBtnPrimary,
                      ]}
                      onPress={handleConfirm}
                      activeOpacity={0.8}
                      accessibilityRole="button"
                    >
                      <Text
                        style={[
                          styles.confirmBtnText,
                          isDestructive
                            ? styles.confirmBtnTextDanger
                            : styles.confirmBtnTextPrimary,
                        ]}
                      >
                        {dialogState.confirmText || "Confirm"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.singleBtn}
                    onPress={handleDismiss}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                  >
                    <Text style={styles.singleBtnText}>
                      {dialogState.buttonText || "Got it"}
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </Animated.View>
        </Animated.View>
      </Modal>
    </DialogContext.Provider>
  );
}

export function useDialog(): DialogContextValue {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error("useDialog must be used within a DialogProvider");
  }
  return context;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.scrim,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  dialogCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    alignItems: "center",
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  // The muted tokens are already translucent. Appending "55" made an invalid colour (P6a).
  iconCircleDanger: {
    backgroundColor: colors.dangerMuted,
  },
  iconCircleAccent: {
    backgroundColor: colors.accentMuted,
  },
  dialogTitle: {
    ...typography.subtitle,
    fontWeight: "700",
    color: colors.textPrimary,
    textAlign: "center",
  },
  dialogMessage: {
    ...typography.small,
    fontWeight: "500",
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.sm,
    lineHeight: 20,
    paddingHorizontal: spacing.xs,
  },
  buttonRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.xl,
    width: "100%",
  },
  cancelBtn: {
    flex: 1,
    minHeight: size.minTouch,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: {
    ...typography.caption,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  confirmBtn: {
    flex: 1,
    minHeight: size.minTouch,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  // White reads on red-600; on `danger` it was 3.76:1 (P6b).
  confirmBtnDanger: {
    backgroundColor: colors.dangerStrong,
  },
  // The same fill as every other primary button (B5).
  confirmBtnPrimary: {
    backgroundColor: colors.accentFill,
  },
  confirmBtnText: {
    ...typography.caption,
    fontWeight: "700",
  },
  confirmBtnTextDanger: {
    color: colors.accentForeground,
  },
  // White, like every other primary button's label (P6c).
  confirmBtnTextPrimary: {
    color: colors.accentForeground,
  },
  singleBtn: {
    width: "100%",
    minHeight: size.minTouch,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.xl,
  },
  singleBtnText: {
    ...typography.caption,
    fontWeight: "700",
    color: colors.accent,
  },
});
