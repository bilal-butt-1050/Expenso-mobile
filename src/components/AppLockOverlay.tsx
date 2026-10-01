import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Modal, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Button } from "./Button";
import { isAppLockEnabled, lockAvailability, setAppLockEnabled, unlock } from "../lib/appLock";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

/** How long the app can be away before it locks again. Short trips (a copied number) don't. */
const RELOCK_AFTER_MS = 30_000;

/**
 * Covers the app until the phone's screen lock is passed, when App lock is on: at start, and on
 * coming back after RELOCK_AFTER_MS. `ready` holds the first prompt until the splash is gone.
 */
export function AppLockOverlay({ ready, onSignOut }: { ready: boolean; onSignOut: () => Promise<void> }) {
  const [locked, setLocked] = useState(isAppLockEnabled);
  // The PIN screen is its own activity: the app goes to the background and back while it's up,
  // which must not count as leaving.
  const authenticating = useRef(false);
  const leftAt = useRef<number | null>(null);

  const tryUnlock = useCallback(async () => {
    if (authenticating.current) return;
    // Set before any await, so a tap and the automatic prompt can't both get through (G4 m5).
    authenticating.current = true;
    const lockState = await lockAvailability();
    // The phone's screen lock was removed since: there's nothing to ask for, so lock is off. An
    // error is not "removed": the lock stays (fail closed).
    if (lockState === "none") {
      authenticating.current = false;
      setAppLockEnabled(false);
      setLocked(false);
      return;
    }
    const ok = await unlock();
    authenticating.current = false;
    leftAt.current = null;
    if (ok) setLocked(false);
  }, []);

  useEffect(() => {
    if (ready && locked) void tryUnlock();
  }, [ready, locked, tryUnlock]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (authenticating.current) return;
      if (state === "background") leftAt.current = Date.now();
      if (state === "active" && leftAt.current !== null) {
        const away = Date.now() - leftAt.current;
        leftAt.current = null;
        if (away >= RELOCK_AFTER_MS && isAppLockEnabled()) setLocked(true);
      }
    });
    return () => sub.remove();
  }, []);

  if (!locked) return null;
  const content = (
    <View style={styles.cover} accessibilityViewIsModal>
      <MaterialCommunityIcons name="lock-outline" size={48} color={colors.accent} />
      <Text style={styles.title}>Expenso is locked</Text>
      <Text style={styles.body}>Unlock with your fingerprint, face or screen lock.</Text>
      <Button label="Unlock" onPress={() => void tryUnlock()} style={styles.button} />
      {/* The way out if the phone's prompt ever fails: signing in again needs the account. */}
      <Button label="Sign out" variant="ghost" onPress={() => void onSignOut()} style={styles.signOut} />
    </View>
  );
  // Until the splash is gone, a plain cover under it. After that, its own window: above any sheet or
  // dialog left open, with TalkBack and the Back button kept inside it (G4 M1).
  if (!ready) return content;
  return (
    <Modal visible transparent={false} animationType="none" onRequestClose={() => {}} statusBarTranslucent>
      {content}
    </Modal>
  );
}

const styles = StyleSheet.create({
  cover: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    gap: spacing.md,
  },
  title: { ...typography.title, textAlign: "center" },
  body: { ...typography.body, color: colors.textSecondary, textAlign: "center" },
  button: { alignSelf: "stretch", marginTop: spacing.md },
  signOut: { alignSelf: "stretch" },
});
