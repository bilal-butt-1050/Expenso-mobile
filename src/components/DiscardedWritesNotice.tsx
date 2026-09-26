import { useEffect, useSyncExternalStore } from "react";
import { useIsFocused } from "@react-navigation/native";
import { useSnackbar } from "./snackbar/SnackbarContext";
import { clearDiscardedWrites, getDiscardedWrites, subscribeDiscardedWrites } from "../lib/mutations";

/**
 * "N offline changes weren't saved" (S-9). Lives inside the tabs, so after a session purge the
 * count waits in memory and is shown at the first tab focus after the next sign-in, never on the
 * sign-in screen. Counts that arrive together are summed into one message.
 */
export function DiscardedWritesNotice() {
  const count = useSyncExternalStore(subscribeDiscardedWrites, getDiscardedWrites);
  const isFocused = useIsFocused();
  const snackbar = useSnackbar();

  useEffect(() => {
    if (count <= 0 || !isFocused) return;
    clearDiscardedWrites();
    snackbar.show({
      id: `S-9-${Date.now()}`,
      text: `${count} offline change${count === 1 ? "" : "s"} weren't saved.`,
      icon: "alert-outline",
      duration: 8000,
      priority: 2,
      sticky: true,
    });
  }, [count, isFocused, snackbar]);

  return null;
}
