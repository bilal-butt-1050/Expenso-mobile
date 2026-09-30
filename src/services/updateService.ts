import * as Updates from "expo-updates";
import { AppState, AppStateStatus } from "react-native";

/**
 * Service to manage Over-The-Air (OTA) updates cleanly and reliably.
 */
class UpdateService {
  private isChecking = false;

  /**
   * Initializes the update check listeners.
   * Runs on app startup and whenever the app returns to foreground.
   */
  public init() {
    if (__DEV__ || !Updates.isEnabled) {
      return;
    }

    // Check immediately on startup
    this.checkForUpdates();

    // Check when user returns to the app from background
    const subscription = AppState.addEventListener("change", (nextState: AppStateStatus) => {
      if (nextState === "active") {
        this.checkForUpdates();
      }
    });

    return () => {
      subscription.remove();
    };
  }

  /**
   * Checks the Expo server for a newer update and applies it straight away: download, then reload.
   * No prompt and no second restart (Bilal). It runs at launch and on return to the app, so the
   * reload lands before anything is under way.
   */
  public async checkForUpdates(): Promise<boolean> {
    if (__DEV__ || !Updates.isEnabled || this.isChecking) {
      return false;
    }

    this.isChecking = true;
    try {
      const checkResult = await Updates.checkForUpdateAsync();
      if (checkResult.isAvailable) {
        const fetchResult = await Updates.fetchUpdateAsync();
        if (fetchResult.isNew) {
          await Updates.reloadAsync();
          return true;
        }
      }
    } catch (error) {
      // In offline or poor network environments, log gracefully without breaking the UX
      console.log("[UpdateService] OTA update check skipped/failed:", error);
    } finally {
      this.isChecking = false;
    }

    return false;
  }

  /**
   * Returns current OTA update diagnostics for settings or debugging.
   */
  public getDiagnostics() {
    return {
      isEnabled: Updates.isEnabled,
      channel: Updates.channel,
      runtimeVersion: Updates.runtimeVersion,
      updateId: Updates.updateId,
      isEmbeddedLaunch: Updates.isEmbeddedLaunch,
      createdAt: Updates.createdAt,
    };
  }
}

export const updateService = new UpdateService();

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August",
  "September", "October", "November", "December"];

/**
 * One line naming the bundle that is actually running, for the Settings footer (DESIGN §S9).
 * It is the evidence R-10 needs that a given update reached this phone, so it's selectable.
 */
export function describeRunningUpdate(): { text: string; a11y: string } {
  const { isEnabled, channel, updateId, isEmbeddedLaunch, createdAt } = updateService.getDiagnostics();
  if (__DEV__ || !isEnabled) {
    return { text: "development", a11y: "Development build" };
  }
  const ch = channel || "unknown channel";
  if (isEmbeddedLaunch || !updateId) {
    return { text: `${ch} · built-in bundle`, a11y: `Running the built-in bundle on the ${ch} channel` };
  }
  const id = updateId.slice(0, 8);
  if (!createdAt) {
    return { text: `${ch} · update ${id}`, a11y: `Running update ${id} on the ${ch} channel` };
  }
  const day = createdAt.getDate();
  const month = MONTHS[createdAt.getMonth()];
  const year = createdAt.getFullYear();
  return {
    text: `${ch} · update ${id} · ${day} ${month.slice(0, 3)} ${year}`,
    a11y: `Running update ${id} on the ${ch} channel, published ${day} ${month} ${year}`,
  };
}
