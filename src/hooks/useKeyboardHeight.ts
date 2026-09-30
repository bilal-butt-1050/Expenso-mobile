import { useEffect, useState } from "react";
import { Keyboard, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * The keyboard's height while it's open, on Android only (iOS uses KeyboardAvoidingView). Same
 * approach as BottomSheet: the app is edge-to-edge, so Android's adjustResize no longer shrinks the
 * window for the keyboard, and whatever must stay above it lifts itself by this much.
 *
 * RN reports the IME inset minus the system-bar inset (ReactRootView.checkForKeyboardEvents), so on
 * a full-screen view the keyboard's top edge is this height plus the bottom safe-area inset.
 *
 * Listens only while `active`; inactive, it reports 0.
 */
export function useAndroidKeyboardHeight(active = true): number {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    if (Platform.OS !== "android" || !active) {
      setHeight(0);
      return;
    }
    // No initial read of an already-open keyboard: both callers start listening just as it's being
    // dismissed (a sheet opening, or one closing over the form), and `isVisible()` stays true until
    // keyboardDidHide, so it would lift and then drop (G4 M1). Start from 0, as it did before.
    setHeight(0);
    // Android only emits the Did events. RN re-emits keyboardDidShow when the height changes.
    const show = Keyboard.addListener("keyboardDidShow", (e) => setHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener("keyboardDidHide", () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, [active]);
  return height;
}

/**
 * How far the keyboard's top edge is from the bottom of an edge-to-edge window (the app's, or a
 * Modal's, which RN also draws edge-to-edge): the keyboard's height plus the navigation bar under
 * it. 0 while it's closed.
 */
export function useKeyboardOffset(active = true): number {
  const height = useAndroidKeyboardHeight(active);
  const { bottom } = useSafeAreaInsets();
  return height > 0 ? height + bottom : 0;
}
