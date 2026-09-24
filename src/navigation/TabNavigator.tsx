import React, { useState } from "react";
import { Platform, StyleSheet, TouchableOpacity, View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Svg, { Path } from "react-native-svg";
import { TabParamList, RootStackParamList } from "../types/navigation";
import { colors } from "../theme/colors";
import { HomeScreen } from "../screens/home/HomeScreen";
import { ActivityScreen } from "../screens/activity/ActivityScreen";
import { BudgetScreen } from "../screens/budget/BudgetScreen";
import { QuickActionSheet } from "../components/QuickActionSheet";
import { hapticMedium } from "../utils/haptics";

const Tab = createBottomTabNavigator<TabParamList>();

/** The [+] tab renders no screen — its button opens the quick-action sheet instead. */
function QuickAddPlaceholder() {
  return null;
}

const ICONS: Record<string, { active: string; inactive: string }> = {
  Home: { active: "view-dashboard", inactive: "view-dashboard-outline" },
  Activity: { active: "swap-vertical-bold", inactive: "swap-vertical" },
  Budget: { active: "chart-donut", inactive: "chart-arc" },
};

export function TabNavigator() {
  const insets = useSafeAreaInsets();
  const rootNavigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [quickActionVisible, setQuickActionVisible] = useState(false);

  const paddingBottom = Math.max(insets.bottom + 8, Platform.OS === "ios" ? 28 : 16);
  const height = TAB_BAR_CONTENT_HEIGHT + paddingBottom;

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
          tabBarLabelStyle: { fontSize: 11, fontWeight: "600", marginTop: 2 },
          tabBarIcon: ({ color, focused }) => {
            const icon = ICONS[route.name];
            if (!icon) return null;
            return (
              <MaterialCommunityIcons
                name={(focused ? icon.active : icon.inactive) as any}
                color={color}
                size={24}
              />
            );
          },
        })}
      >
        <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: "Home" }} />
        <Tab.Screen name="Activity" component={ActivityScreen} options={{ tabBarLabel: "Activity" }} />

        <Tab.Screen
          name="QuickAdd"
          component={QuickAddPlaceholder}
          options={{
            tabBarShowLabel: false,
            tabBarAccessibilityLabel: "Add a transaction",
            tabBarButton: () => (
              <View style={styles.centerButtonSlot}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Add a transaction"
                  onPress={() => {
                    hapticMedium();
                    setQuickActionVisible(true);
                  }}
                  // The button sits above the bar, and Android does not deliver touches to the
                  // part of a child that overflows its parent. The slot below is tall enough to
                  // contain the whole button, so every pixel of it is tappable.
                  style={styles.centerButtonTouchable}
                >
                  <View style={styles.centerButtonRing}>
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

        <Tab.Screen name="Budget" component={BudgetScreen} options={{ tabBarLabel: "Budgets" }} />
      </Tab.Navigator>

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

const TAB_BAR_CONTENT_HEIGHT = 62;
const BUTTON_SIZE = 58;
const BUTTON_LIFT = 20;

const styles = StyleSheet.create({
  centerButtonSlot: {
    flex: 1,
    alignItems: "center",
    // Contains the lifted button rather than letting it overflow, which is what made its top
    // ~20px dead on Android.
    height: TAB_BAR_CONTENT_HEIGHT,
    justifyContent: "flex-start",
    zIndex: 10,
  },
  centerButtonTouchable: {
    marginTop: -BUTTON_LIFT,
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  centerButtonRing: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
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
