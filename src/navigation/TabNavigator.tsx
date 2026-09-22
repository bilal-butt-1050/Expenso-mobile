import React, { useState } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { TabParamList, RootStackParamList } from "../types/navigation";
import { colors } from "../theme/colors";
import { HomeScreen } from "../screens/home/HomeScreen";
import { ActivityScreen } from "../screens/activity/ActivityScreen";
import { BudgetScreen } from "../screens/budget/BudgetScreen";
import { SettingsScreen } from "../screens/settings/SettingsScreen";
import { ExpensesListScreen } from "../screens/expenses/ExpensesListScreen";
import { IncomeListScreen } from "../screens/income/IncomeListScreen";
import { QuickActionSheet } from "../components/QuickActionSheet";
import { Platform, View, StyleSheet, TouchableOpacity } from "react-native";
import Svg, { Path } from "react-native-svg";
import { hapticMedium } from "../utils/haptics";

const Tab = createBottomTabNavigator<TabParamList>();

// Dummy component for QuickAdd tab (handled via custom tabBarButton)
function EmptyComponent() {
  return null;
}

export function TabNavigator() {
  const insets = useSafeAreaInsets();
  const rootNavigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [quickActionVisible, setQuickActionVisible] = useState(false);

  // Dynamic height and bottom padding for home indicator / navigation bar clearance
  const paddingBottom = Math.max(insets.bottom + 8, Platform.OS === "ios" ? 28 : 16);
  const height = 62 + paddingBottom;

  return (
    <>
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
            height,
            paddingBottom,
            paddingTop: 6,
            elevation: 0,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: "600",
            marginTop: 2,
          },
          tabBarIcon: ({ color, focused }) => {
            if (route.name === "QuickAdd") {
              return null;
            }

            let iconName: string;
            switch (route.name) {
              case "Home":
                iconName = focused ? "view-dashboard" : "view-dashboard-outline";
                break;
              case "Activity":
                iconName = focused ? "swap-vertical-bold" : "swap-vertical";
                break;
              case "Budget":
                iconName = focused ? "chart-donut" : "chart-arc";
                break;
              case "Settings":
                iconName = focused ? "cog" : "cog-outline";
                break;
              case "Loans":
                iconName = focused ? "hand-coin" : "hand-coin-outline";
                break;
              default:
                iconName = "circle-outline";
            }

            return (
              <MaterialCommunityIcons
                name={iconName as any}
                color={color}
                size={24}
              />
            );
          },
        })}
      >
        {/* Primary 5 Tabs (with center elevated + cutout button) */}
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{ tabBarLabel: "Home" }}
        />

        <Tab.Screen
          name="Activity"
          component={ActivityScreen}
          options={{ tabBarLabel: "Activity" }}
        />

        <Tab.Screen
          name="QuickAdd"
          component={EmptyComponent}
          options={{
            tabBarShowLabel: false,
            tabBarButton: () => (
              <View style={styles.centerButtonDock} pointerEvents="box-none">
                <TouchableOpacity
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Quick Add"
                  onPress={() => {
                    hapticMedium();
                    setQuickActionVisible(true);
                  }}
                  style={styles.centerButtonTouchable}
                >
                  <View style={styles.centerCutoutOuter}>
                    <View style={styles.centerButtonInner}>
                      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                        <Path
                          d="M12 5V19M5 12H19"
                          stroke="#FFFFFF"
                          strokeWidth={2.8}
                          strokeLinecap="round"
                        />
                      </Svg>
                    </View>
                  </View>
                </TouchableOpacity>
              </View>
            ),
          }}
        />

        <Tab.Screen
          name="Budget"
          component={BudgetScreen}
          options={{ tabBarLabel: "Budgets" }}
        />

        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ tabBarLabel: "Settings" }}
        />

        {/* Backwards-Compatibility Hidden Tabs */}
        <Tab.Screen
          name="Loans"
          component={ActivityScreen}
          initialParams={{ filter: "LOANS" }}
          options={{
            tabBarButton: () => null,
            tabBarItemStyle: { display: "none" },
          }}
        />
        <Tab.Screen
          name="Expenses"
          component={ExpensesListScreen}
          options={{
            tabBarButton: () => null,
            tabBarItemStyle: { display: "none" },
          }}
        />
        <Tab.Screen
          name="Income"
          component={IncomeListScreen}
          options={{
            tabBarButton: () => null,
            tabBarItemStyle: { display: "none" },
          }}
        />
      </Tab.Navigator>

      {/* Central Spring-Animated Quick Action Sheet */}
      <QuickActionSheet
        visible={quickActionVisible}
        onClose={() => setQuickActionVisible(false)}
        onSelectExpense={() => rootNavigation.navigate("ExpenseForm")}
        onSelectIncome={() => rootNavigation.navigate("IncomeForm")}
        onSelectLend={() => rootNavigation.navigate("LoanForm", { initialType: "LENT" })}
        onSelectBorrow={() => rootNavigation.navigate("LoanForm", { initialType: "BORROWED" })}
      />
    </>
  );
}

const styles = StyleSheet.create({
  centerButtonDock: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    zIndex: 10,
  },
  centerButtonTouchable: {
    top: -20,
    alignItems: "center",
    justifyContent: "center",
  },
  centerCutoutOuter: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: colors.background,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  centerButtonInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
});
