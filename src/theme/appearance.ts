import { Appearance, DevSettings } from "react-native";
import * as SecureStore from "expo-secure-store";
import * as Updates from "expo-updates";

/**
 * Light, dark, or the phone's setting. The palette is chosen once at startup, before any screen
 * builds its styles (they read `colors` when their module loads), so a change applies on a quick
 * restart rather than by re-rendering every screen.
 *
 * SecureStore only because it can be read synchronously at startup; the value isn't a secret.
 */
export type AppearancePref = "system" | "light" | "dark";
export type ColorScheme = "light" | "dark";

const PREF_KEY = "expenso_appearance";
/** Set just before a restart for a theme change, so the restart skips the splash. */
const QUICK_RELOAD_KEY = "expenso_quick_reload";

function read(key: string): string | null {
  try {
    return SecureStore.getItem(key);
  } catch {
    return null;
  }
}

export function getAppearancePref(): AppearancePref {
  const value = read(PREF_KEY);
  return value === "light" || value === "dark" ? value : "system";
}

function resolve(pref: AppearancePref): ColorScheme {
  if (pref !== "system") return pref;
  return Appearance.getColorScheme() === "light" ? "light" : "dark";
}

/** The scheme this run of the app was built with. Fixed until the next start. */
export const activeScheme: ColorScheme = resolve(getAppearancePref());

/** Restarts the JS app in place; the splash is skipped for it. */
async function quickReload() {
  try {
    SecureStore.setItem(QUICK_RELOAD_KEY, "1");
  } catch {
    // Without the flag the restart just shows the splash.
  }
  if (__DEV__) DevSettings.reload();
  else await Updates.reloadAsync();
}

/** Saves the choice, and restarts if it changes what's on screen. */
export async function setAppearancePref(pref: AppearancePref): Promise<void> {
  try {
    SecureStore.setItem(PREF_KEY, pref);
  } catch {
    return;
  }
  if (resolve(pref) !== activeScheme) await quickReload();
}

/** On "System", follow a change of the phone's setting (checked when the app comes back). */
export async function followSystemAppearance(): Promise<void> {
  if (getAppearancePref() === "system" && resolve("system") !== activeScheme) await quickReload();
}

/** True once, for the start right after a theme restart. */
export function consumeQuickReload(): boolean {
  if (read(QUICK_RELOAD_KEY) !== "1") return false;
  try {
    SecureStore.deleteItemAsync(QUICK_RELOAD_KEY).catch(() => {});
  } catch {
    // Harmless: the next start shows the splash.
  }
  return true;
}
