import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/spacing";

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

export interface ToastOptions {
  message: string;
  type?: "success" | "error" | "info";
  duration?: number;
}

interface DialogContextValue {
  confirm: (options: ConfirmOptions) => void;
  alert: (options: AlertOptions) => void;
  showToast: (options: ToastOptions) => void;
}

const DialogContext = createContext<DialogContextValue | null>(null);

type DialogState =
  | { type: "none" }
  | ({ type: "confirm" } & ConfirmOptions)
  | ({ type: "alert" } & AlertOptions);

interface ToastState {
  visible: boolean;
  message: string;
  type: "success" | "error" | "info";
}

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [dialogState, setDialogState] = useState<DialogState>({ type: "none" });
  const [toastState, setToastState] = useState<ToastState>({
    visible: false,
    message: "",
    type: "info",
  });

  const toastAnim = useRef(new Animated.Value(0)).current;
  const modalAnim = useRef(new Animated.Value(0)).current;
  const toastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    if (dialogState.type !== "none") {
      Animated.spring(modalAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 250,
        friction: 20,
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

  const showToast = useCallback(
    ({ message, type = "info", duration = 2400 }: ToastOptions) => {
      if (toastTimeout.current) {
        clearTimeout(toastTimeout.current);
      }

      setToastState({ visible: true, message, type });

      Animated.spring(toastAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 250,
        friction: 15,
      }).start();

      toastTimeout.current = setTimeout(() => {
        Animated.timing(toastAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }).start(() => {
          setToastState((prev) => ({ ...prev, visible: false }));
        });
      }, duration);
    },
    [toastAnim]
  );

  const handleCancel = () => {
    if (dialogState.type === "confirm" && dialogState.onCancel) {
      dialogState.onCancel();
    }
    setDialogState({ type: "none" });
  };

  const handleConfirm = async () => {
    if (dialogState.type === "confirm") {
      const fn = dialogState.onConfirm;
      setDialogState({ type: "none" });
      await fn();
    }
  };

  const handleDismiss = () => {
    if (dialogState.type === "alert" && dialogState.onDismiss) {
      dialogState.onDismiss();
    }
    setDialogState({ type: "none" });
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
    <DialogContext.Provider value={{ confirm, alert, showToast }}>
      {children}

      {/* Themed Custom Modal Dialog */}
      <Modal
        transparent
        visible={isModalOpen}
        animationType="none"
        onRequestClose={dialogState.type === "confirm" ? handleCancel : handleDismiss}
        statusBarTranslucent
      >
        <TouchableWithoutFeedback
          onPress={dialogState.type === "confirm" ? handleCancel : handleDismiss}
        >
          <Animated.View style={[styles.backdrop, { 
            paddingBottom: Math.max(insets.bottom, spacing.lg),
            opacity: modalAnim,
          }]}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <Animated.View style={[styles.dialogCard, {
                transform: [{
                  scale: modalAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.9, 1]
                  })
                }]
              }]}>
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
                      >
                        <Text style={styles.singleBtnText}>
                          {dialogState.buttonText || "Got it"}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </Animated.View>
            </TouchableWithoutFeedback>
          </Animated.View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Themed Custom Floating Toast Notification */}
      {toastState.visible && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.toastWrapper,
            {
              top: Math.max(insets.top + spacing.sm, spacing.lg),
              opacity: toastAnim,
              transform: [
                {
                  translateY: toastAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-16, 0],
                  }),
                },
                {
                  scale: toastAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.94, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.toastPill}>
            <MaterialCommunityIcons
              name={
                toastState.type === "success"
                  ? "check-circle"
                  : toastState.type === "error"
                  ? "alert-circle"
                  : "information"
              }
              size={18}
              color={
                toastState.type === "success"
                  ? colors.accent
                  : toastState.type === "error"
                  ? colors.danger
                  : colors.textPrimary
              }
            />
            <Text style={styles.toastText} numberOfLines={2}>
              {toastState.message}
            </Text>
          </View>
        </Animated.View>
      )}
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
    backgroundColor: "#000000C4",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  dialogCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: colors.surfaceRaised,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    alignItems: "center",
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  iconCircleDanger: {
    backgroundColor: colors.dangerMuted + "55",
  },
  iconCircleAccent: {
    backgroundColor: colors.accentMuted + "55",
  },
  dialogTitle: {
    fontSize: 19,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
  },
  dialogMessage: {
    fontSize: 14,
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
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  confirmBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmBtnDanger: {
    backgroundColor: colors.danger,
  },
  confirmBtnPrimary: {
    backgroundColor: colors.accent,
  },
  confirmBtnText: {
    fontSize: 15,
    fontWeight: "700",
  },
  confirmBtnTextDanger: {
    color: "#FFFFFF",
  },
  confirmBtnTextPrimary: {
    color: colors.background,
  },
  singleBtn: {
    width: "100%",
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.xl,
  },
  singleBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.accent,
  },

  // Toast Styles
  toastWrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 9999,
  },
  toastPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    shadowColor: "#000000",
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    maxWidth: "88%",
  },
  toastText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
