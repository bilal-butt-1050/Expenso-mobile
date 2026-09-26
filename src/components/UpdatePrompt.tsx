import { useEffect, useSyncExternalStore } from "react";
import { useIsFocused } from "@react-navigation/native";
import { updateService } from "../services/updateService";
import { useAnyOverlayOpen } from "../lib/overlays";
import { useSnackbar, useSnackbarHost } from "./snackbar/SnackbarContext";

/**
 * Offers "Update ready · Restart" once a new OTA bundle has downloaded (R-18, DESIGN §S9).
 *
 * Shown at most once per session, and only when it interrupts nothing: a tab screen is focused, no
 * sheet, picker or dialog is open (any of them would draw over it), and the snackbar is idle.
 * Forms, Settings and the auth stack are never interrupted. If it is dismissed or never shown, the
 * update still applies on the next cold start.
 */
export function UpdatePrompt() {
  const ready = useSyncExternalStore(updateService.subscribeUpdateReady, updateService.isUpdateReady);
  const isFocused = useIsFocused();
  const overlayOpen = useAnyOverlayOpen();
  const { idle } = useSnackbarHost();
  const snackbar = useSnackbar();

  useEffect(() => {
    if (!ready || updateService.wasPromptOffered() || !isFocused || overlayOpen || !idle) return;
    updateService.markPromptOffered();
    snackbar.show({
      id: "S-7",
      text: "Update ready",
      action: {
        label: "Restart",
        a11yLabel: "Restart to update",
        onPress: () => {
          updateService.reloadApp().catch(() => {
            // The bundle is already on disk, so it still applies on the next cold start.
          });
        },
      },
      duration: 8000,
      priority: 4,
    });
  }, [ready, isFocused, overlayOpen, idle, snackbar]);

  return null;
}
