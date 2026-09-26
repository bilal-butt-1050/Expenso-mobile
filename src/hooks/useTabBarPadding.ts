import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { size, spacing } from "../theme/spacing";

/**
 * Bottom padding a tab screen's scroll container needs so its last item scrolls fully clear of the
 * tab dock *and* the floating quick-add button above it:
 *
 *   dock + gap below the button + button + gap above it
 *
 * Replaces a hardcoded `paddingBottom: 140` that was a guess at the dock's height. Tab screens only:
 * `useBottomTabBarHeight()` throws outside the tab navigator, so stack screens use
 * `useSafeAreaInsets()` instead.
 */
export function useTabBarPadding(): number {
  return useBottomTabBarHeight() + spacing.md + size.fab + spacing.md;
}
