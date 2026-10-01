import React from "react";
import { StyleSheet } from "react-native";
import { AppState, Appearance } from "react-native";
import * as SystemUI from "expo-system-ui";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import { QueryProvider } from "./src/lib/QueryProvider";
import { AuthProvider } from "./src/context/AuthContext";
import { AppDataProvider } from "./src/context/AppDataContext";
import { DialogProvider } from "./src/context/DialogContext";
import { SnackbarProvider } from "./src/components/snackbar/SnackbarContext";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { colors } from "./src/theme/colors";
import { activeScheme, followSystemAppearance } from "./src/theme/appearance";
import { updateService } from "./src/services/updateService";
import { startOnlineTracking } from "./src/lib/onlineStatus";
import { preloadSounds } from "./src/lib/sounds";

export default function App() {
  React.useEffect(() => {
    const stopUpdates = updateService.init();
    const stopOnlineTracking = startOnlineTracking();
    SystemUI.setBackgroundColorAsync(colors.background).catch(() => {});
    // Sounds load after the first frame, off the startup path (G4 m8).
    const soundsTimer = setTimeout(preloadSounds, 1500);
    // On "System", a change of the phone's light/dark setting applies when the app comes back.
    const appearance = AppState.addEventListener("change", (state) => {
      if (state === "active") void followSystemAppearance();
    });
    const systemTheme = Appearance.addChangeListener(() => {
      if (AppState.currentState === "active") void followSystemAppearance();
    });
    return () => {
      stopUpdates?.();
      stopOnlineTracking();
      appearance.remove();
      systemTheme.remove();
      clearTimeout(soundsTimer);
    };
  }, []);

  // Gesture handler needs this root, or its gestures are never recognised. In a release build that
  // failure is silent (the error only throws in development), which is how swipe-to-delete shipped
  // not working at all.
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider
        initialMetrics={initialWindowMetrics}
        style={styles.root}
      >
        <AuthProvider>
          <QueryProvider>
            <AppDataProvider>
              <DialogProvider>
                <SnackbarProvider>
                  <StatusBar style={activeScheme === "light" ? "dark" : "light"} />
                  <RootNavigator />
                </SnackbarProvider>
              </DialogProvider>
            </AppDataProvider>
          </QueryProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
