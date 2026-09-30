import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import * as SplashScreen from "expo-splash-screen";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme/colors";
import { RootStackParamList } from "../types/navigation";
import { AuthNavigator } from "./AuthNavigator";
import { navigationRef } from "./navigationRef";
import { TabNavigator } from "./TabNavigator";
import { ExpenseFormScreen } from "../screens/expenses/ExpenseFormScreen";
import { IncomeFormScreen } from "../screens/income/IncomeFormScreen";
import { CategoryFormScreen } from "../screens/settings/CategoryFormScreen";
import { LoanFormScreen } from "../screens/loans/LoanFormScreen";
import { OnboardingTourScreen, TOUR_SEEN_KEY } from "../screens/onboarding/OnboardingTourScreen";
import { OpeningCashScreen } from "../screens/onboarding/OpeningCashScreen";
import { SettingsScreen } from "../screens/settings/SettingsScreen";
import { AnimatedSplash } from "../components/AnimatedSplash";
import { useKeyboardOffset } from "../hooks/useKeyboardHeight";
import { useAnyOverlayOpen } from "../lib/overlays";

SplashScreen.preventAutoHideAsync().catch(() => {});

/** How long after signup an account still counts as new, for the opening-cash step. */
const NEW_ACCOUNT_MS = 24 * 60 * 60 * 1000;


const Stack = createNativeStackNavigator<RootStackParamList>();

const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.surface,
    border: colors.border,
    primary: colors.accent,
    text: colors.textPrimary,
  },
};

export function RootNavigator() {
  const { user, isLoading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  const [needsTour, setNeedsTour] = useState<boolean | null>(null);

  // The tour is for a fresh install: it shows before sign-in, once per phone. Stay undecided
  // (`null`) until auth has settled, or the navigator mounts with a guessed route and remounts (a
  // flash after the splash).
  useEffect(() => {
    if (isLoading) return;

    if (user?.id) {
      // Someone signed in already knows the app, so this phone never shows the first-run tour.
      AsyncStorage.setItem(TOUR_SEEN_KEY, "true").catch(() => {});
      setNeedsTour(false);
      return;
    }

    let cancelled = false;
    AsyncStorage.getItem(TOUR_SEEN_KEY)
      .then((val) => {
        if (!cancelled) setNeedsTour(val !== "true");
      })
      .catch(() => {
        if (!cancelled) setNeedsTour(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id, isLoading]);

  // Edge-to-edge Android doesn't resize the window for the keyboard, so screens sat under it and
  // it covered their buttons. The app shrinks above it instead. Not while a sheet or dialog is
  // open: those are their own windows and lift themselves.
  const overlayOpen = useAnyOverlayOpen();
  const keyboardOffset = useKeyboardOffset(!overlayOpen);

  // Dismiss native splash immediately on mount —
  // our custom AnimatedSplash is already mounted and covering the screen with zero flicker.
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
  }, []);

  const isNavigatorReady = !isLoading && needsTour !== null;
  // Opening cash is asked for once, right after an account is created (D-64), never of an existing
  // account. Strictly null: a user cached by an older build lacks the field (undefined).
  const isNewAccount = !!user?.createdAt && Date.now() - new Date(user.createdAt).getTime() < NEW_ACCOUNT_MS;
  const needsOpeningCash = !!user && isNewAccount && user.openingBalance === null;

  return (
    <View style={[styles.root, { paddingBottom: keyboardOffset }]}>
      <NavigationContainer ref={navigationRef} theme={navigationTheme}>
        {isNavigatorReady && (
          <Stack.Navigator
            key={user ? (needsOpeningCash ? "opening-stack" : "tabs-stack") : needsTour ? "welcome-stack" : "auth-stack"}
            screenOptions={{ headerShown: false }}
            // Must name a screen that exists in the branch rendered below. Signed out, only
            // `Auth` is registered — pointing at `Tabs` there threw
            // "Couldn't find a screen named 'Tabs' to use as 'initialRouteName'" and took the
            // whole app down on launch. React Navigation 6 only warned about this; 7 throws.
            initialRouteName={user ? (needsOpeningCash ? "OpeningCash" : "Tabs") : needsTour ? "OnboardingTour" : "Auth"}
          >
            {user && needsOpeningCash ? (
              // Alone in its branch. With it also registered beside Tabs, the remount after saving
              // restored the old state and put the user straight back on it.
              <Stack.Screen name="OpeningCash" component={OpeningCashScreen} options={{ gestureEnabled: false }} />
            ) : user ? (
              <>
                <Stack.Screen name="Tabs" component={TabNavigator} />
                <Stack.Screen
                  name="Settings"
                  component={SettingsScreen}
                  // The native header gives Settings a visible back and its title (B4), styled by
                  // the navigation theme like the form headers.
                  options={{ animation: "slide_from_right", headerShown: true, title: "Settings" }}
                />
                <Stack.Screen name="OnboardingTour" component={OnboardingTourScreen} />
                {/* Header titles follow the mode (P11): an edit says so, and a new loan names its
                    direction like the + sheet does. LoanFormScreen updates it if the toggle flips. */}
                <Stack.Group screenOptions={{ presentation: "modal", headerShown: true, animation: "slide_from_bottom" }}>
                  <Stack.Screen
                    name="ExpenseForm"
                    component={ExpenseFormScreen}
                    options={({ route }) => ({ title: route.params?.transaction ? "Edit expense" : "Add expense" })}
                  />
                  <Stack.Screen
                    name="IncomeForm"
                    component={IncomeFormScreen}
                    options={({ route }) => ({ title: route.params?.transaction ? "Edit income" : "Add income" })}
                  />
                  <Stack.Screen
                    name="CategoryForm"
                    component={CategoryFormScreen}
                    options={({ route }) => ({ title: route.params?.category ? "Edit category" : "Add category" })}
                  />
                  <Stack.Screen
                    name="LoanForm"
                    component={LoanFormScreen}
                    options={({ route }) => ({
                      title: route.params?.loan
                        ? "Edit loan"
                        : route.params?.initialType === "BORROWED"
                          ? "Borrow money"
                          : "Lend money",
                    })}
                  />
                </Stack.Group>
              </>
            ) : (
              <>
                <Stack.Screen name="OnboardingTour" component={OnboardingTourScreen} />
                <Stack.Screen name="Auth" component={AuthNavigator} />
              </>
            )}
          </Stack.Navigator>
        )}
      </NavigationContainer>

      {showSplash && (
        <AnimatedSplash
          ready={isNavigatorReady}
          onComplete={handleSplashComplete}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
});
