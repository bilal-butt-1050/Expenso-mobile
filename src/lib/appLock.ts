import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";

/**
 * App lock: the phone's own screen-lock check (fingerprint or face where the phone has them,
 * otherwise its PIN, pattern or password). A phone with no screen lock at all can't use it.
 * The setting is per phone. SecureStore so it can be read synchronously at startup.
 */
const KEY = "expenso_app_lock";

export function isAppLockEnabled(): boolean {
  try {
    return SecureStore.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function setAppLockEnabled(enabled: boolean): void {
  try {
    SecureStore.setItem(KEY, enabled ? "1" : "0");
  } catch {
    // Not saved: the switch reads it back and shows the real state.
  }
}

/** Whether this phone has a screen lock the app can ask for. */
export async function canUseAppLock(): Promise<boolean> {
  try {
    const level = await LocalAuthentication.getEnrolledLevelAsync();
    return level !== LocalAuthentication.SecurityLevel.NONE;
  } catch {
    return false;
  }
}

/** Asks for the phone's screen lock. True when the person passes it. */
export async function unlock(reason = "Unlock Expenso"): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: reason,
      // Fall back to the phone's PIN, pattern or password when there's no biometric, or it fails.
      disableDeviceFallback: false,
      cancelLabel: "Cancel",
    });
    return result.success;
  } catch {
    return false;
  }
}
