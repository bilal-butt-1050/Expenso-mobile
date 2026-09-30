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

/** "Last updated 1 Oct 2026": when the running update was published. Null in development or when unknown. */
export function describeLastUpdated(): string | null {
  const { isEnabled, createdAt } = updateService.getDiagnostics();
  if (__DEV__ || !isEnabled || !createdAt) return null;
  return `Last updated ${createdAt.getDate()} ${MONTHS[createdAt.getMonth()].slice(0, 3)} ${createdAt.getFullYear()}`;
}
