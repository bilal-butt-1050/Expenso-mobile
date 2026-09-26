import * as Updates from "expo-updates";
import { AppState, AppStateStatus } from "react-native";

/**
 * Service to manage Over-The-Air (OTA) updates cleanly and reliably.
 */
class UpdateService {
  private isChecking = false;
  /** A newer bundle has been downloaded and applies on reload. Sticky for the session. */
  private updateReady = false;
  private readyListeners = new Set<() => void>();

  /** "Update ready" is offered at most once per process, even across logout and login. */
  private promptOffered = false;
  public wasPromptOffered = (): boolean => this.promptOffered;
  public markPromptOffered = (): void => {
    this.promptOffered = true;
  };

  /** For `useSyncExternalStore`: whether a downloaded update is waiting to be applied. */
  public isUpdateReady = (): boolean => this.updateReady;

  public subscribeUpdateReady = (listener: () => void): (() => void) => {
    this.readyListeners.add(listener);
    return () => {
      this.readyListeners.delete(listener);
    };
  };

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
          // Without a prompt the new bundle only took effect on the second cold start. The
          // app now offers a restart (UpdatePrompt); if that is ignored, the next cold start
          // applies it as before.
          this.updateReady = true;
          this.readyListeners.forEach((listener) => listener());
          onUpdateReady?.();
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
