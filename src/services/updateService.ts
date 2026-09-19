import * as Updates from "expo-updates";
import { AppState, AppStateStatus } from "react-native";

/**
 * Service to manage Over-The-Air (OTA) updates cleanly and reliably.
 */
class UpdateService {
  private isChecking = false;
  private hasPromptedThisSession = false;

  /**
   * Initializes the update check listeners.
   * Runs on app startup and whenever the app returns to foreground.
   */
  public init(onUpdateReady?: () => void) {
    if (__DEV__ || !Updates.isEnabled) {
      return;
    }

    // Check immediately on startup
    this.checkForUpdates(onUpdateReady);

    // Check when user returns to the app from background
    const subscription = AppState.addEventListener("change", (nextState: AppStateStatus) => {
      if (nextState === "active") {
        this.checkForUpdates(onUpdateReady);
      }
    });

    return () => {
      subscription.remove();
    };
  }

  /**
   * Checks the Expo server for new published updates.
   * If a new update is found, it downloads it immediately.
   */
  public async checkForUpdates(onUpdateReady?: () => void): Promise<boolean> {
    if (__DEV__ || !Updates.isEnabled || this.isChecking) {
      return false;
    }

    this.isChecking = true;
    try {
      const checkResult = await Updates.checkForUpdateAsync();
      if (checkResult.isAvailable) {
        const fetchResult = await Updates.fetchUpdateAsync();
        if (fetchResult.isNew) {
          if (onUpdateReady) {
            onUpdateReady();
          } else if (!this.hasPromptedThisSession) {
            this.hasPromptedThisSession = true;
            // Next time the user opens the app or upon reload, the update is live
          }
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
   * Immediately reloads the app with the latest downloaded OTA bundle.
   */
  public async reloadApp() {
    if (!__DEV__ && Updates.isEnabled) {
      await Updates.reloadAsync();
    }
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
