import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { spacing } from "../theme/spacing";

/**
 * Bottom padding a scroll container needs so its last item clears the elevated tab dock.
 *
 * Replaces a hardcoded `paddingBottom: 140` repeated across four screens. That number was a guess
 * at the dock's height and was wrong on any device whose safe-area inset differed from the one it
 * was tuned on — too little on tall Android gesture bars, too much everywhere else.
 */
export function useTabBarPadding(extra: number = spacing.xl): number {
  return useBottomTabBarHeight() + extra;
}
