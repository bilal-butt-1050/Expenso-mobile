import React from "react";
import { StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, initialWindowMetrics } from "react-native-safe-area-context";
import { AuthProvider } from "./src/context/AuthContext";
import { AppDataProvider } from "./src/context/AppDataContext";
import { DialogProvider } from "./src/context/DialogContext";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { colors } from "./src/theme/colors";
import { updateService } from "./src/services/updateService";

export default function App() {
  React.useEffect(() => {
    const cleanup = updateService.init();
    return cleanup;
  }, []);

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics} style={styles.root}>
      <AuthProvider>
        <AppDataProvider>
          <DialogProvider>
            <StatusBar style="light" />
            <RootNavigator />
          </DialogProvider>
        </AppDataProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
