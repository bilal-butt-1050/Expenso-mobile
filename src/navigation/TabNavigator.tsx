import React, { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { BottomTabBarButtonProps, createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { PressableScale } from "../components/PressableScale";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { TabParamList, RootStackParamList } from "../types/navigation";
import { colors } from "../theme/colors";
import { radius, size, spacing } from "../theme/spacing";
import { elevation } from "../theme/elevation";
import { typography } from "../theme/typography";
import { HomeScreen } from "../screens/home/HomeScreen";
import { ActivityScreen } from "../screens/activity/ActivityScreen";
import { BudgetScreen } from "../screens/budget/BudgetScreen";
import { QuickActionSheet } from "../components/QuickActionSheet";
import { hapticLight, hapticMedium } from "../utils/haptics";
import { dockHeight, dockPaddingBottom } from "./dock";
import { HOME_BUTTON_DROP, HOME_BUTTON_SIZE, NotchedTabBackground } from "./NotchedTabBackground";
import { SnackbarHost } from "../components/snackbar/SnackbarHost";
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

/**
 * The raised Home button's bottom edge, measured down from the dock's top edge: half the button
 * plus its drop, so its centre sits HOME_BUTTON_DROP below the edge, at the cutout's centre (D-61).
 */
const HOME_BOTTOM_BELOW_DOCK_TOP = HOME_BUTTON_SIZE / 2 + HOME_BUTTON_DROP;

/**
 * Three tabs, Activity · Home · Budget, with Home raised in the centre as the main screen (D-57),
 * plus a floating quick-add button (D-11).
 *
 * The raised Home button is drawn as an overlay sibling of the navigator, like the quick-add
 * button. Lifted out of the bar itself it would be dead where it overflows, because Android doesn't
 * deliver touches outside a parent's bounds (ui-review §1.2). With three equal slots the centre slot
 * sits at exactly 50% (§1.1). The bar is drawn with a round cutout the button sits in (D-61), so
 * that slot has no label.
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
        // Back from Activity or Budget goes to Home, then out of the app (the default went to the
        // first tab, Activity).
        backBehavior="initialRoute"
        screenListeners={({ route }) => ({ focus: () => setFocusedTab(route.name) })}
        screenOptions={({ route }) => ({
          headerShown: false,
          // A short cross-fade between tabs instead of a hard cut.
          animation: "fade",
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.textMuted,
          // Transparent, so the cutout drawn by the background shows the app behind it (D-61).
          tabBarStyle: {
            backgroundColor: "transparent",
            borderTopWidth: 0,
            height: dock,
            paddingBottom: dockPaddingBottom(insets.bottom),
            paddingTop: spacing.xs,
            elevation: 0,
          },
          tabBarLabelStyle: { ...typography.tabLabel, marginTop: 2 },
          tabBarButton: (props) => <PlainTabButton {...props} />,
          tabBarBackground: () => <NotchedTabBackground height={dock} />,
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
        {/* No label: the raised button sits in the bar's cutout, where a label would be clipped. */}
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{ tabBarLabel: () => null, tabBarAccessibilityLabel: "Home" }}
        />
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
          { bottom: dock - HOME_BOTTOM_BELOW_DOCK_TOP },
          homeFocused ? styles.homeButtonActive : styles.homeButtonIdle,
        ]}
      >
        <MaterialCommunityIcons
          name={homeFocused ? ICONS.Home.active : ICONS.Home.inactive}
          size={28}
          color={homeFocused ? colors.accentForeground : colors.accent}
        />
      </Pressable>

      <PressableScale
        scaleTo={0.9}
        accessibilityRole="button"
        accessibilityLabel="Add a transaction"
        accessibilityHint="Choose expense, income, lend or borrow"
        onPress={() => {
          hapticMedium();
          setQuickActionVisible(true);
        }}
        style={[styles.fab, { right: spacing.lg + insets.right, bottom: dock + spacing.md }]}
      >
        <MaterialCommunityIcons name="plus" size={24} color={colors.accentForeground} />
      </PressableScale>

      {/* After the button, so it layers above it. It sits above the button's top edge anyway. */}
      <SnackbarHost />
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
  // Shows through the tab bar's cutout, matching the screens above it.
  root: { flex: 1, backgroundColor: colors.background },
  fab: {
    position: "absolute",
    width: size.fab,
    height: size.fab,
    borderRadius: radius.pill,
    // Filled controls use the deeper shade, so the white icon reads clearly (B5).
    backgroundColor: colors.accentFill,
    alignItems: "center",
    justifyContent: "center",
    ...elevation.floating,
  },
  iconPlaceholder: { width: 24, height: 24 },
  homeButton: {
    position: "absolute",
    left: "50%",
    marginLeft: -HOME_BUTTON_SIZE / 2,
    width: HOME_BUTTON_SIZE,
    height: HOME_BUTTON_SIZE,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    ...elevation.floating,
  },
  homeButtonActive: { backgroundColor: colors.accentFill },
  homeButtonIdle: { backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border },
});
