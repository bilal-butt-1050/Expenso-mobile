import React, { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { TabParamList, RootStackParamList } from "../types/navigation";
import { colors } from "../theme/colors";
import { radius, size, spacing } from "../theme/spacing";
import { elevation } from "../theme/elevation";
import { HomeScreen } from "../screens/home/HomeScreen";
import { ActivityScreen } from "../screens/activity/ActivityScreen";
import { BudgetScreen } from "../screens/budget/BudgetScreen";
import { QuickActionSheet } from "../components/QuickActionSheet";
import { hapticMedium } from "../utils/haptics";
import { dockHeight, dockPaddingBottom } from "./dock";

const Tab = createBottomTabNavigator<TabParamList>();

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

const ICONS: Record<keyof TabParamList, { active: IconName; inactive: IconName }> = {
  Home: { active: "view-dashboard", inactive: "view-dashboard-outline" },
  Activity: { active: "swap-vertical-bold", inactive: "swap-vertical" },
  Budget: { active: "chart-donut", inactive: "chart-arc" },
};

/**
 * Three tabs plus a floating quick-add button (D-11).
 *
 * The button used to be a fourth, centre slot in the bar — but with four equal slots the third one
 * sits at 62.5%, not 50%, so it read as visibly off-centre. It now floats bottom-right above the
 * dock, as a sibling of the navigator, so its whole hit area lies inside a full-screen parent and it
 * only ever appears over the tab screens (stack screens cover it).
 */
export function TabNavigator() {
  const insets = useSafeAreaInsets();
  const rootNavigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [quickActionVisible, setQuickActionVisible] = useState(false);

  const dock = dockHeight(insets.bottom);

  return (
    <View style={styles.root}>
      <Tab.Navigator
        initialRouteName="Home"
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopWidth: 1,
            borderTopColor: colors.borderLight,
            height: dock,
            paddingBottom: dockPaddingBottom(insets.bottom),
            paddingTop: 6,
            elevation: 0,
          },
          tabBarLabelStyle: { fontSize: 11, fontWeight: "600", marginTop: 2 },
          tabBarIcon: ({ color, focused }) => {
            const icon = ICONS[route.name];
            return (
              <MaterialCommunityIcons
                name={focused ? icon.active : icon.inactive}
                color={color}
                size={24}
              />
            );
          },
        })}
      >
        <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: "Home" }} />
        <Tab.Screen name="Activity" component={ActivityScreen} options={{ tabBarLabel: "Activity" }} />
        <Tab.Screen name="Budget" component={BudgetScreen} options={{ tabBarLabel: "Budget" }} />
      </Tab.Navigator>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add a transaction"
        accessibilityHint="Choose expense, income, lend or borrow"
        onPress={() => {
          hapticMedium();
          setQuickActionVisible(true);
        }}
        style={({ pressed }) => [
          styles.fab,
          { right: spacing.lg + insets.right, bottom: dock + spacing.md },
          pressed && styles.fabPressed,
        ]}
      >
        <MaterialCommunityIcons name="plus" size={24} color={colors.accentForeground} />
      </Pressable>

      <QuickActionSheet
        visible={quickActionVisible}
        onClose={() => setQuickActionVisible(false)}
        onSelectExpense={() => rootNavigation.navigate("ExpenseForm")}
        onSelectIncome={() => rootNavigation.navigate("IncomeForm")}
        onSelectLend={() => rootNavigation.navigate("LoanForm", { initialType: "LENT" })}
        onSelectBorrow={() => rootNavigation.navigate("LoanForm", { initialType: "BORROWED" })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  fab: {
    position: "absolute",
    width: size.fab,
    height: size.fab,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    ...elevation.floating,
  },
  fabPressed: { opacity: 0.85 },
});
