import React, { useEffect, useRef } from "react";
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  PanResponder,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRegisterOverlay } from "../lib/overlays";

interface Props {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export function BottomSheet({ visible, onClose, children }: Props) {
  const [showModal, setShowModal] = React.useState(visible);
  // Read inside the effect without making it a dependency.
  const showModalRef = useRef(showModal);
  showModalRef.current = showModal;
  const panY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  const keyboardHeight = useAndroidKeyboardHeight(showModal);
  useRegisterOverlay(showModal);

  // Depends on `visible` alone. It previously also depended on `showModal`, which this effect
  // sets — so opening ran the entrance animation, re-ran the effect, and restarted it from
  // off-screen. Every sheet in the app visibly snapped down and re-sprang.
  useEffect(() => {
    if (visible) {
      setShowModal(true);
      Keyboard.dismiss();
      panY.setValue(SCREEN_HEIGHT);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(panY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 250,
          friction: 25,
        }),
      ]).start();
    } else if (showModalRef.current) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(panY, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowModal(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const handleClose = () => {
    onClose();
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 10,
      onMoveShouldSetPanResponderCapture: () => false,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          panY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100 || gestureState.vy > 1.5) {
          handleClose();
        } else {
          Animated.spring(panY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 250,
            friction: 25,
          }).start();
        }
      },
    })
  ).current;

  return (
    <Modal visible={showModal} transparent animationType="none" onRequestClose={handleClose}>
      <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={handleClose} />
      </Animated.View>

      <KeyboardAvoidingView
        // Android: the app is edge-to-edge, so the window doesn't resize for the keyboard, and a
        // Modal gets no help from adjustResize either. The keyboard covered the lower fields, so
        // the sheet lifts itself by the keyboard's height. The top padding keeps a tall sheet on
        // screen; its content shrinks (and can scroll) instead.
        style={[styles.sheetWrap, { paddingTop: insets.top + spacing.lg, marginBottom: keyboardHeight }]}
        // A ternary with two identical branches. On Android `padding` fights the window's own
        // adjustResize and lifts the sheet twice as far as the keyboard.
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        pointerEvents="box-none"
      >
        <Animated.View
          style={[styles.shrink, { transform: [{ translateY: panY }] }]}
          {...panResponder.panHandlers}
        >
          <TouchableOpacity activeOpacity={1} style={[
              styles.sheetContent,
              // With the keyboard up, it already covers the navigation bar area.
              { paddingBottom: keyboardHeight > 0 ? spacing.lg : Math.max(insets.bottom, spacing.lg) },
            ]}>
            <View style={styles.dragHandle} />
            {children}
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/**
 * The keyboard's height while it's open, on Android only (iOS uses KeyboardAvoidingView). Listens
 * only while the sheet is showing.
 */
function useAndroidKeyboardHeight(active: boolean): number {
  const [height, setHeight] = React.useState(0);
  useEffect(() => {
    if (Platform.OS !== "android" || !active) {
      setHeight(0);
      return;
    }
    const show = Keyboard.addListener("keyboardDidShow", (e) => setHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener("keyboardDidHide", () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, [active]);
  return height;
}

const styles = StyleSheet.create({
  shrink: { flexShrink: 1 },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
  },
  sheetWrap: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheetContent: {
    flexShrink: 1,
    backgroundColor: colors.surfaceRaised,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.border,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignSelf: "center",
    marginBottom: 16,
  },
});
