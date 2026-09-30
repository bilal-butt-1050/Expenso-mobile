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
import { radius, spacing } from "../theme/spacing";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRegisterOverlay } from "../lib/overlays";
import { useLatest } from "../hooks/useLatest";
import { useReduceMotion } from "../hooks/useReduceMotion";
import { useAndroidKeyboardHeight } from "../hooks/useKeyboardHeight";

interface Props {
  visible: boolean;
  onClose: () => void;
  /** After the exit animation: the moment it's safe to navigate or open another modal. */
  onHidden?: () => void;
  children: React.ReactNode;
}

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export function BottomSheet({ visible, onClose, onHidden, children }: Props) {
  const onHiddenRef = useLatest(onHidden);
  const [showModal, setShowModal] = React.useState(visible);
  // Read inside the effect without making it a dependency.
  const showModalRef = useRef(showModal);
  showModalRef.current = showModal;
  const panY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  const keyboardHeight = useAndroidKeyboardHeight(showModal);
  useRegisterOverlay(showModal);
  // Reduced motion: the sheet fades in and out in place instead of sliding (W3b). A drag still
  // moves it, since the finger drives that.
  const reduceMotion = useReduceMotion();
  const reduceMotionRef = useLatest(reduceMotion);

  // Depends on `visible` alone. It previously also depended on `showModal`, which this effect
  // sets — so opening ran the entrance animation, re-ran the effect, and restarted it from
  // off-screen. Every sheet in the app visibly snapped down and re-sprang.
  useEffect(() => {
    if (visible) {
      setShowModal(true);
      Keyboard.dismiss();
      const fadeIn = Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      });
      if (reduceMotionRef.current) {
        panY.setValue(0);
        fadeIn.start();
      } else {
        panY.setValue(SCREEN_HEIGHT);
        Animated.parallel([
          fadeIn,
          Animated.spring(panY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 250,
            friction: 25,
          }),
        ]).start();
      }
    } else if (showModalRef.current) {
      const fadeOut = Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      });
      const exit = reduceMotionRef.current
        ? fadeOut
        : Animated.parallel([
            fadeOut,
            Animated.timing(panY, {
              toValue: SCREEN_HEIGHT,
              duration: 250,
              useNativeDriver: true,
            }),
          ]);
      exit.start(() => {
        setShowModal(false);
        onHiddenRef.current?.();
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
        } else if (reduceMotionRef.current) {
          panY.setValue(0);
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
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={handleClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
        />
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
          {/* A touchable only so a tap on the sheet doesn't reach the scrim. Not accessible, or
              TalkBack gets an extra, unlabelled stop that reads the whole sheet as one blob. */}
          <TouchableOpacity
            activeOpacity={1}
            accessible={false}
            style={[
              styles.sheetContent,
              // With the keyboard up, it already covers the navigation bar area.
              { paddingBottom: keyboardHeight > 0 ? spacing.lg : Math.max(insets.bottom, spacing.lg) },
            ]}
          >
            <View style={styles.dragHandle} />
            {children}
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  shrink: { flexShrink: 1 },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.scrim,
  },
  sheetWrap: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheetContent: {
    flexShrink: 1,
    backgroundColor: colors.surfaceRaised,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginBottom: spacing.md,
  },
});
