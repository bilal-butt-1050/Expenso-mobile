import { useEffect, useSyncExternalStore } from "react";

/**
 * How many modal overlays (sheets, dialogs, pickers) are open right now, app-wide.
 *
 * Every RN `Modal` draws above everything else, including the snackbar. Low-priority prompts such
 * as "Update ready" wait until nothing covers the screen instead of being spent unseen underneath.
 */
let openCount = 0;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Call from any component that renders a `Modal`, with whether it is currently shown. */
export function useRegisterOverlay(open: boolean) {
  useEffect(() => {
    if (!open) return;
    openCount += 1;
    emit();
    return () => {
      openCount -= 1;
      emit();
    };
  }, [open]);
}

export function useAnyOverlayOpen(): boolean {
  return useSyncExternalStore(subscribe, () => openCount > 0);
}
