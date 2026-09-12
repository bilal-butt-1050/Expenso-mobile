import React, { useEffect } from "react";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import * as SplashScreen from "expo-splash-screen";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme/colors";
import { RootStackParamList } from "../types/navigation";
import { AuthNavigator } from "./AuthNavigator";
import { TabNavigator } from "./TabNavigator";
import { ExpenseFormScreen } from "../screens/expenses/ExpenseFormScreen";
import { IncomeFormScreen } from "../screens/income/IncomeFormScreen";
import { CategoriesScreen } from "../screens/settings/CategoriesScreen";
import { CategoryFormScreen } from "../screens/settings/CategoryFormScreen";
import { IncomeScreen } from "../screens/settings/IncomeScreen";

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

  useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => {
        SplashScreen.hideAsync().catch(() => {});
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="Tabs" component={TabNavigator} />
            <Stack.Group screenOptions={{ presentation: "modal", headerShown: true }}>
              <Stack.Screen name="ExpenseForm" component={ExpenseFormScreen} options={{ title: "Expense" }} />
              <Stack.Screen name="IncomeForm" component={IncomeFormScreen} options={{ title: "Log Income" }} />
              <Stack.Screen name="Categories" component={CategoriesScreen} options={{ title: "Categories" }} />
              <Stack.Screen
                name="CategoryForm"
                component={CategoryFormScreen}
                options={{ title: "Category" }}
              />
              <Stack.Screen name="Income" component={IncomeScreen} options={{ title: "Legacy Income" }} />
            </Stack.Group>
          </>
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
});
