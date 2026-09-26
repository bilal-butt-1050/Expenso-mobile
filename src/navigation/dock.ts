import { Platform } from "react-native";
import { dock } from "../theme/spacing";

/**
 * Geometry of the bottom tab dock, in one place.
 *
 * The tab bar's style, the floating quick-add button's position and `useTabBarPadding()` all derive
 * from this, so the button can never drift onto the bar and a list's last row can never end up
 * under either.
 */

/** Space below the tab icons: clears the home indicator / gesture bar, with a floor on devices that report none. */
export function dockPaddingBottom(insetBottom: number): number {
  return Math.max(insetBottom + dock.insetGap, Platform.OS === "ios" ? dock.minBottomIos : dock.minBottomAndroid);
}

/** Full dock height including the bottom safe-area inset. */
export function dockHeight(insetBottom: number): number {
  return dock.contentHeight + dockPaddingBottom(insetBottom);
}
