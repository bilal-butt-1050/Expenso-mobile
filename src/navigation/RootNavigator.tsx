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
import { TabNavigator } from "./TabNavigator";
import { ExpenseFormScreen } from "../screens/expenses/ExpenseFormScreen";
import { IncomeFormScreen } from "../screens/income/IncomeFormScreen";
import { CategoriesScreen } from "../screens/settings/CategoriesScreen";
import { CategoryFormScreen } from "../screens/settings/CategoryFormScreen";
import { LoansScreen } from "../screens/loans/LoansScreen";
import { LoanFormScreen } from "../screens/loans/LoanFormScreen";
import { OnboardingTourScreen } from "../screens/onboarding/OnboardingTourScreen";
import { SettingsScreen } from "../screens/settings/SettingsScreen";
import { AnimatedSplash } from "../components/AnimatedSplash";

SplashScreen.preventAutoHideAsync().catch(() => {});

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
  const [initialRoute, setInitialRoute] = useState<"Tabs" | "OnboardingTour">("Tabs");
  const [tourCheckDone, setTourCheckDone] = useState(false);

  useEffect(() => {
    if (user?.id) {
      AsyncStorage.getItem(`@expenso_tour_completed_${user.id}`)
        .then((val) => {
          if (!val) {
            setInitialRoute("OnboardingTour");
          } else {
            setInitialRoute("Tabs");
          }
        })
        .finally(() => {
          setTourCheckDone(true);
        });
    } else {
      setTourCheckDone(true);
    }
  }, [user?.id]);

  // Dismiss native splash immediately on mount —
  // our custom AnimatedSplash is already mounted and covering the screen with zero flicker.
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
  }, []);

  return (
    <View style={styles.root}>
      <NavigationContainer theme={navigationTheme}>
        <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={initialRoute}>
          {user ? (
            <>
              <Stack.Screen name="Tabs" component={TabNavigator} />
              <Stack.Screen
                name="Settings"
                component={SettingsScreen}
                options={{ animation: "slide_from_right" }}
              />
              <Stack.Screen name="Loans" component={LoansScreen} />
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
      </NavigationContainer>

      {showSplash && (
        <AnimatedSplash
          ready={!isLoading}
          onComplete={handleSplashComplete}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
});
