import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { TabParamList } from "../types/navigation";
import { colors } from "../theme/colors";
import { HomeScreen } from "../screens/home/HomeScreen";
import { ExpensesListScreen } from "../screens/expenses/ExpensesListScreen";
import { IncomeListScreen } from "../screens/income/IncomeListScreen";
import { BudgetScreen } from "../screens/budget/BudgetScreen";
import { SettingsScreen } from "../screens/settings/SettingsScreen";

const Tab = createBottomTabNavigator<TabParamList>();

const ICONS: Record<keyof TabParamList, string> = {
  Home: "view-dashboard",
  Expenses: "receipt-text",
  Income: "wallet-plus",
  Budget: "chart-donut",
  Settings: "cog",
};

export function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarIcon: ({ color, size }) => (
          <MaterialCommunityIcons name={ICONS[route.name] as any} color={color} size={size} />
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Expenses" component={ExpensesListScreen} />
      <Tab.Screen name="Income" component={IncomeListScreen} />
      <Tab.Screen name="Budget" component={BudgetScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}
