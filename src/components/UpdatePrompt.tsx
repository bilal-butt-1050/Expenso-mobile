import { useEffect, useRef, useSyncExternalStore } from "react";
import { useIsFocused } from "@react-navigation/native";
import { updateService } from "../services/updateService";
import { useDialog } from "../context/DialogContext";
import { useSnackbar, useSnackbarHost } from "./snackbar/SnackbarContext";

interface Props {
  /** A sheet owned by the tab navigator (the quick-add sheet) is open. */
  sheetOpen: boolean;
}

/**
 * Offers "Update ready · Restart" once a new OTA bundle has downloaded (R-18, DESIGN §S9).
 *
 * Shown at most once per session, and only when it interrupts nothing: a tab screen is focused, no
 * dialog or sheet is open, and the snackbar is idle. Forms, Settings and the auth stack are never
 * interrupted. If it is dismissed or never shown, the update still applies on the next cold start.
 */
export function UpdatePrompt({ sheetOpen }: Props) {
  const ready = useSyncExternalStore(updateService.subscribeUpdateReady, updateService.isUpdateReady);
  const isFocused = useIsFocused();
  const { isOpen: dialogOpen } = useDialog();
  const snackbar = useSnackbar();
  // Re-evaluated whenever the visible message changes, i.e. when the snackbar may have gone idle.
  const { current } = useSnackbarHost();
  const offered = useRef(false);

  useEffect(() => {
    if (!ready || offered.current || !isFocused || dialogOpen || sheetOpen) return;
    if (current || !snackbar.isIdle()) return;
    offered.current = true;
    snackbar.show({
      id: "S-7",
      text: "Update ready",
      action: {
        label: "Restart",
        a11yLabel: "Restart to apply the update",
        onPress: () => {
          void updateService.reloadApp();
        },
      },
      duration: 8000,
      priority: 4,
    });
  }, [ready, isFocused, dialogOpen, sheetOpen, current, snackbar]);

  return null;
}
