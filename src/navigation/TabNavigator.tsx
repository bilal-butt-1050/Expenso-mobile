import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TabParamList } from "../types/navigation";
import { colors } from "../theme/colors";
import { HomeScreen } from "../screens/home/HomeScreen";
import { ExpensesListScreen } from "../screens/expenses/ExpensesListScreen";
import { IncomeListScreen } from "../screens/income/IncomeListScreen";
import { BudgetScreen } from "../screens/budget/BudgetScreen";
import { SettingsScreen } from "../screens/settings/SettingsScreen";
import { Platform, View, StyleSheet } from "react-native";

const Tab = createBottomTabNavigator<TabParamList>();

const ICONS: Record<keyof TabParamList, string> = {
  Home: "view-dashboard",
  Expenses: "receipt-text",
  Income: "wallet-plus",
  Budget: "chart-donut",
  Settings: "cog",
};

export function TabNavigator() {
  const insets = useSafeAreaInsets();
  
  // Calculate dynamic height and padding to ensure it fully clears the gesture area
  const paddingBottom = Math.max(insets.bottom + 10, Platform.OS === 'ios' ? 28 : 20);
  const height = 64 + paddingBottom;

  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 0,
          height,
          paddingBottom,
          paddingTop: 8,
          elevation: 0, // Remove android shadow for flat look
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
          marginTop: 2,
        },
        tabBarIcon: ({ color, size, focused }) => {
          if (route.name === "Home") {
            return (
              <View style={styles.homeTabWrapper}>
                <View style={[styles.homeTabButton, focused && styles.homeTabActive]}>
                  <MaterialCommunityIcons name={ICONS[route.name] as any} color={colors.surface} size={32} />
                </View>
              </View>
            );
          }
          return <MaterialCommunityIcons name={ICONS[route.name] as any} color={color} size={26} />;
        },
      })}
    >
      <Tab.Screen name="Expenses" component={ExpensesListScreen} />
      <Tab.Screen name="Income" component={IncomeListScreen} />
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Budget" component={BudgetScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  homeTabWrapper: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    top: -14,
  },
  homeTabButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  homeTabActive: {
    backgroundColor: "#818cf8", // Slightly lighter indigo when active
  }
});
