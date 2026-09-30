import React, { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { BottomTabBarButtonProps, createBottomTabNavigator } from "@react-navigation/bottom-tabs";
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
import { hapticLight, hapticMedium } from "../utils/haptics";
import { dockHeight, dockPaddingBottom } from "./dock";
import { SnackbarHost } from "../components/snackbar/SnackbarHost";
import { UpdatePrompt } from "../components/UpdatePrompt";
import { DiscardedWritesNotice } from "../components/DiscardedWritesNotice";

const Tab = createBottomTabNavigator<TabParamList>();

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

const ICONS: Record<keyof TabParamList, { active: IconName; inactive: IconName }> = {
  Home: { active: "view-dashboard", inactive: "view-dashboard-outline" },
  Activity: { active: "swap-vertical-bold", inactive: "swap-vertical" },
  Budget: { active: "chart-donut", inactive: "chart-arc" },
};

/**
 * A tab button with no press effect: no Android ripple (the library draws a large borderless one)
 * and no dimming. Bilal found it looked bad (D-60). The tab's own colour change on selection is the
 * feedback.
 */
function PlainTabButton({
  children,
  style,
  onPress,
  onLongPress,
  testID,
  "aria-label": ariaLabel,
  "aria-selected": ariaSelected,
}: BottomTabBarButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={style}
      testID={testID}
      accessibilityRole="tab"
      accessibilityLabel={ariaLabel}
      accessibilityState={{ selected: !!ariaSelected }}
    >
      {children}
    </Pressable>
  );
}

/** How far the raised Home button rises above the top edge of the dock: half its height. */
const HOME_RISE = size.fab / 2;

/**
 * Three tabs, Activity · Home · Budget, with Home raised in the centre as the main screen (D-57),
 * plus a floating quick-add button (D-11).
 *
 * The raised Home button is drawn as an overlay sibling of the navigator, like the quick-add
 * button. Lifted out of the bar itself it would be dead where it overflows, because Android doesn't
 * deliver touches outside a parent's bounds (ui-review §1.2). With three equal slots the centre slot
 * sits at exactly 50% (§1.1); the button covers that slot's icon, and the slot's label stays below.
 *
 * The quick-add button used to be a fourth, centre slot in the bar — but with four equal slots the third one
 * sits at 62.5%, not 50%, so it read as visibly off-centre. It now floats bottom-right above the
 * dock, as a sibling of the navigator, so its whole hit area lies inside a full-screen parent and it
 * only ever appears over the tab screens (stack screens cover it).
 */
export function TabNavigator() {
  const insets = useSafeAreaInsets();
  const rootNavigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [quickActionVisible, setQuickActionVisible] = useState(false);
  const [focusedTab, setFocusedTab] = useState<keyof TabParamList>("Home");
  const homeFocused = focusedTab === "Home";

  const dock = dockHeight(insets.bottom);

  return (
    <View style={styles.root}>
      <Tab.Navigator
        initialRouteName="Home"
        screenListeners={({ route }) => ({ focus: () => setFocusedTab(route.name) })}
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
          tabBarButton: (props) => <PlainTabButton {...props} />,
          tabBarIcon: ({ color, focused }) => {
            // The raised button carries Home's icon; the slot keeps only its label.
            if (route.name === "Home") return <View style={styles.iconPlaceholder} />;
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
        <Tab.Screen name="Activity" component={ActivityScreen} options={{ tabBarLabel: "Activity" }} />
        <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: "Home" }} />
        <Tab.Screen name="Budget" component={BudgetScreen} options={{ tabBarLabel: "Budget" }} />
      </Tab.Navigator>

      {/* Hidden from screen readers: the slot below is already the "Home, tab 2 of 3" stop. */}
      <Pressable
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        onPress={() => {
          hapticLight();
          rootNavigation.navigate("Tabs", { screen: "Home" });
        }}
        style={[
          styles.homeButton,
          { bottom: dock - HOME_RISE },
          homeFocused ? styles.homeButtonActive : styles.homeButtonIdle,
        ]}
      >
        <MaterialCommunityIcons
          name={homeFocused ? ICONS.Home.active : ICONS.Home.inactive}
          size={26}
          color={homeFocused ? colors.accentForeground : colors.accent}
        />
      </Pressable>

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

      {/* After the button, so it layers above it. It sits above the button's top edge anyway. */}
      <SnackbarHost />
      <UpdatePrompt />
      <DiscardedWritesNotice />

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
  iconPlaceholder: { width: 24, height: 24 },
  homeButton: {
    position: "absolute",
    left: "50%",
    marginLeft: -size.fab / 2,
    width: size.fab,
    height: size.fab,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    ...elevation.floating,
  },
  homeButtonActive: { backgroundColor: colors.accent },
  homeButtonIdle: { backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border },
});
