import { Platform } from "react-native";

/**
 * Geometry of the bottom tab dock, in one place.
 *
 * The tab bar's style, the floating quick-add button's position and `useTabBarPadding()` all derive
 * from this, so the button can never drift onto the bar and a list's last row can never end up
 * under either.
 */
const DOCK_CONTENT_HEIGHT = 62;

/** Space below the tab icons: clears the home indicator / gesture bar, with a floor on devices that report none. */
export function dockPaddingBottom(insetBottom: number): number {
  return Math.max(insetBottom + 8, Platform.OS === "ios" ? 28 : 16);
}

/** Full dock height including the bottom safe-area inset. */
export function dockHeight(insetBottom: number): number {
  return DOCK_CONTENT_HEIGHT + dockPaddingBottom(insetBottom);
}
