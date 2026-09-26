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
import { CategoriesScreen } from "../screens/settings/CategoriesScreen";
import { CategoryFormScreen } from "../screens/settings/CategoryFormScreen";
import { LoanFormScreen } from "../screens/loans/LoanFormScreen";
import { OnboardingTourScreen } from "../screens/onboarding/OnboardingTourScreen";
import { SettingsScreen } from "../screens/settings/SettingsScreen";
import { LoansScreen } from "../screens/loans/LoansScreen";
import { AnimatedSplash } from "../components/AnimatedSplash";

SplashScreen.preventAutoHideAsync().catch(() => {});

/** How long after signup an account still counts as new for the first-run tour. */
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

  // Stay undecided (`null`) until auth has settled. Resolving this early meant the navigator
  // mounted with a guessed initial route and then remounted — via the `key` below — the moment the
  // real answer arrived, which showed up as a flash immediately after the splash.
  useEffect(() => {
    if (isLoading) return;

    if (!user?.id) {
      setNeedsTour(false);
      return;
    }

    // The tour is for new accounts. It used to depend only on a flag stored on this phone, so an
    // existing account (data and all) got it again in a new install, or in the other of the
    // preview and production apps. Without createdAt (an older server), keep the old behaviour.
    const isNewAccount = user.createdAt ? Date.now() - new Date(user.createdAt).getTime() < NEW_ACCOUNT_MS : true;
    if (!isNewAccount) {
      setNeedsTour(false);
      return;
    }

    let cancelled = false;
    AsyncStorage.getItem(`@expenso_tour_completed_${user.id}`)
      .then((val) => {
        if (!cancelled) setNeedsTour(val !== "true");
      })
      .catch(() => {
        if (!cancelled) setNeedsTour(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.createdAt, isLoading]);

  // Dismiss native splash immediately on mount —
  // our custom AnimatedSplash is already mounted and covering the screen with zero flicker.
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
  }, []);

  const isNavigatorReady = !isLoading && needsTour !== null;

  return (
    <View style={styles.root}>
      <NavigationContainer ref={navigationRef} theme={navigationTheme}>
        {isNavigatorReady && (
          <Stack.Navigator
            key={user ? (needsTour ? "tour-stack" : "tabs-stack") : "auth-stack"}
            screenOptions={{ headerShown: false }}
            // Must name a screen that exists in the branch rendered below. Signed out, only
            // `Auth` is registered — pointing at `Tabs` there threw
            // "Couldn't find a screen named 'Tabs' to use as 'initialRouteName'" and took the
            // whole app down on launch. React Navigation 6 only warned about this; 7 throws.
            initialRouteName={user ? (needsTour ? "OnboardingTour" : "Tabs") : "Auth"}
          >
            {user ? (
              <>
                <Stack.Screen name="Tabs" component={TabNavigator} />
                <Stack.Screen
                  name="Settings"
                  component={SettingsScreen}
                  options={{ animation: "slide_from_right" }}
                />
                <Stack.Screen
                  name="Loans"
                  component={LoansScreen}
                  options={{ animation: "slide_from_right" }}
                />
                <Stack.Screen name="OnboardingTour" component={OnboardingTourScreen} />
                <Stack.Group screenOptions={{ presentation: "modal", headerShown: true }}>
                  <Stack.Screen name="ExpenseForm" component={ExpenseFormScreen} options={{ title: "Expense" }} />
                  <Stack.Screen name="IncomeForm" component={IncomeFormScreen} options={{ title: "Log Income" }} />
                  <Stack.Screen name="Categories" component={CategoriesScreen} options={{ title: "Categories" }} />
                  <Stack.Screen
                    name="CategoryForm"
                    component={CategoryFormScreen}
                    options={{ title: "Category" }}
                  />
                  <Stack.Screen
                    name="LoanForm"
                    component={LoanFormScreen}
                    options={{ title: "Record Loan" }}
                  />
                </Stack.Group>
              </>
            ) : (
              <Stack.Screen name="Auth" component={AuthNavigator} />
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
