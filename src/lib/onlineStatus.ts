import NetInfo from "@react-native-community/netinfo";
import { onlineManager } from "@tanstack/react-query";
import { useMutationState } from "@tanstack/react-query";

/**
 * Teaches TanStack Query whether the device is actually online.
 *
 * Without this the default online manager reports "online" permanently on React Native. Together
 * with the mutations' `networkMode: "online"` (queryClient.ts), a write made offline is paused
 * rather than attempted, persisted, and replayed on reconnect.
 */
export function startOnlineTracking(): () => void {
  // setEventListener returns void; it stores the unsubscribe internally and calls it when
  // replaced, so tearing down means handing it a no-op listener.
  onlineManager.setEventListener((setOnline) =>
    NetInfo.addEventListener((state) => {
      // `isInternetReachable` is null while the probe is in flight; treat that as connected so
      // a slow probe does not make the whole app look offline on launch.
      setOnline(Boolean(state.isConnected) && state.isInternetReachable !== false);
    })
  );

  return () => onlineManager.setEventListener(() => () => {});
}

/**
 * How many writes are waiting for connectivity.
 *
 * The screen that showed this previously declared `setSyncState` and never called it, so the
 * offline banner could not appear under any circumstance and queued changes were invisible.
 */
export function usePendingWriteCount(): number {
  const paused = useMutationState({
    filters: { status: "pending" },
    select: (mutation) => mutation.state.isPaused,
  });
  return paused.filter(Boolean).length;
}
