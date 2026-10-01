import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import { playSound, type SoundName } from "../lib/sounds";

/*
 * Feedback: haptics, plus a short sound for the moments that deserve one (add, update, delete,
 * settle, sign-in). Errors, taps, tabs and navigation are haptic only, never a sound.
 * Both are user preferences, device-wide (not per account), read once at startup.
 */

const SOUNDS_KEY = "@expenso_pref_sounds";
const HAPTICS_KEY = "@expenso_pref_haptics";
let soundsEnabled = true;
let hapticsEnabled = true;

try {
  Promise.all([AsyncStorage.getItem(SOUNDS_KEY), AsyncStorage.getItem(HAPTICS_KEY)])
    .then(([s, h]) => {
      if (s !== null) soundsEnabled = s === "1";
      if (h !== null) hapticsEnabled = h === "1";
    })
    .catch(() => {});
} catch {
  // Storage unavailable: keep the defaults.
}

const persist = (key: string, value: boolean) => {
  try {
    AsyncStorage.setItem(key, value ? "1" : "0").catch(() => {});
  } catch {
    // The in-memory value still applies for this session.
  }
};

export const getSoundsEnabled = () => soundsEnabled;
export const setSoundsEnabled = (value: boolean) => {
  soundsEnabled = value;
  persist(SOUNDS_KEY, value);
};
export const getHapticsEnabled = () => hapticsEnabled;
export const setHapticsEnabled = (value: boolean) => {
  hapticsEnabled = value;
  persist(HAPTICS_KEY, value);
};

const haptic = (fire: () => Promise<void>) => {
  if (!hapticsEnabled || Platform.OS === "web") return;
  try {
    fire().catch(() => {});
  } catch {
    // A missing haptic engine is not an error worth surfacing.
  }
};

const sound = (name: SoundName) => {
  if (soundsEnabled) playSound(name);
};

const light = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

/** Light tap: buttons, toggles, chips, tab switches. Haptic only. */
export const hapticLight = () => haptic(light);

/** Medium tap: a more significant press. Haptic only. */
export const hapticMedium = () => haptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));

/** Heavy tap. Haptic only. */
export const hapticHeavy = () => haptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));

/** Success notification (e.g. finishing the tour). Haptic only. */
export const hapticSuccess = () => haptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));

/** Warning notification (e.g. a budget line crossed). Haptic only. */
export const hapticWarning = () => haptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));

/** Error notification: a failed save or invalid input. Haptic only, never a sound. */
export const hapticError = () => haptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));

/** A new expense, income or loan was saved: rising two-note chime and a light tap. */
export const hapticRecordCreated = () => {
  sound("add");
  haptic(light);
};

/** An existing record was saved: one soft tick-chime and a light tap. */
export const feedbackUpdated = () => {
  sound("update");
  haptic(light);
};

/** A record was deleted: a whoosh into the bin. The tap lands with the sound's thud (~0.25 s in). */
export const hapticDelete = () => {
  sound("delete");
  const thud = () => haptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
  if (soundsEnabled) setTimeout(thud, 250);
  else thud();
};

/** A loan was settled or a payment recorded: a small coin clink and a light tap. */
export const feedbackSettled = () => {
  sound("settle");
  haptic(light);
};

/** Signed in or signed up: a warm three-note chime and a light tap. */
export const feedbackSignedIn = () => {
  sound("signIn");
  haptic(light);
};
