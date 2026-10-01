import React, { useState, useRef } from "react";
import { Dimensions, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { RootStackParamList } from "../../types/navigation";
import { Button } from "../../components/Button";
import { BudgetVector, CashflowVector, ClarityVector, LoansVector } from "../../components/TourArt";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { hapticSuccess, hapticLight } from "../../utils/haptics";

const { width } = Dimensions.get("window");

type Props = NativeStackScreenProps<RootStackParamList, "OnboardingTour">;

interface TourSlide {
  id: string;
  Vector: React.ComponentType;
  title: string;
  description: string;
}

// The tour teaches the app's map (D-57, W12): one slide per place, in the order people meet them.
const SLIDES: TourSlide[] = [
  {
    id: "add",
    Vector: CashflowVector,
    title: "Add anything with +",
    description: "Expenses, income and loans, in two taps.",
  },
  {
    id: "home",
    Vector: ClarityVector,
    title: "Home shows what you have",
    description: "Cash available, this month, and where it went.",
  },
  {
    id: "activity",
    Vector: LoansVector,
    title: "Activity keeps every entry",
    description: "Swipe left to delete. Loans live in their own tab.",
  },
  {
    id: "budget",
    Vector: BudgetVector,
    title: "Budget sets monthly limits",
    description: "You'll get a note when a category nears its limit.",
  },
];

/** Set once this phone has shown the first-run tour (or has had anyone signed in). */
export const TOUR_SEEN_KEY = "@expenso_tour_seen";

export function OnboardingTourScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const isFromSettings = route.params?.fromSettings ?? false;

  const handleComplete = async () => {
    hapticSuccess();
    if (isFromSettings) {
      navigation.goBack();
      return;
    }
    await AsyncStorage.setItem(TOUR_SEEN_KEY, "true").catch(() => {});
    navigation.replace("Auth", { screen: "Login" });
  };

  const handleNext = () => {
    hapticLight();
    if (activeIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: activeIndex + 1,
        animated: true,
      });
    } else {
      handleComplete();
    }
  };

  return (
    <View style={[styles.root, { paddingTop: Math.max(insets.top, spacing.lg) }]}>
      {/* Top Bar: Wordmark & Skip */}
      <View style={styles.topBar}>
        <Text style={styles.brandWordmark}>expenso</Text>

        <TouchableOpacity
          onPress={handleComplete}
          style={styles.skipBtn}
          // The target grows without moving the bar: about 31pt drawn + 12 on each side.
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Skip tour"
        >
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Swipeable Slides */}
      <FlatList
        overScrollMode="never"
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const newIndex = Math.round(e.nativeEvent.contentOffset.x / width);
          if (newIndex !== activeIndex) {
            hapticLight();
            setActiveIndex(newIndex);
          }
        }}
        renderItem={({ item, index }) => {
          const VectorComponent = item.Vector;
          return (
            <View
              style={[styles.slideWrap, { width }]}
              accessible
              // The slide is read as one stop, so its position leads and its text follows (W12).
              accessibilityLabel={`Slide ${index + 1} of ${SLIDES.length}. ${item.title}. ${item.description}`}
            >
              {/* Custom SVG Vector Container */}
              <View style={styles.iconCircleOuter}>
                <VectorComponent />
              </View>

              {/* Slide Title & Description */}
              <Text style={styles.slideTitle}>{item.title}</Text>
              <Text style={styles.slideDescription}>{item.description}</Text>
            </View>
          );
        }}
      />

      {/* Bottom Controls */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.md }]}>
        {/* Dot Indicators: each slide already says "Slide n of 4", so they stay out of TalkBack */}
        <View style={styles.dotsRow} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          {SLIDES.map((_, idx) => {
            const isActive = idx === activeIndex;
            return <View key={idx} style={[styles.dot, isActive ? styles.dotActive : styles.dotInactive]} />;
          })}
        </View>

        {/* Action Button */}
        <Button
          label={activeIndex === SLIDES.length - 1 ? "Get started" : "Continue"}
          onPress={handleNext}
          style={styles.actionBtn}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  brandWordmark: {
    ...typography.subtitle,
    fontWeight: "800",
    color: colors.accent,
    letterSpacing: -0.5,
  },
  skipBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  skipText: {
    ...typography.small,
    color: colors.textMuted,
    fontWeight: "600",
  },
  slideWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  iconCircleOuter: {
    width: 130,
    height: 130,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xl,
  },
  slideTitle: {
    ...typography.title,
    textAlign: "center",
    letterSpacing: -0.5,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  slideDescription: {
    ...typography.body,
    textAlign: "center",
    color: colors.textSecondary,
    lineHeight: 24,
    maxWidth: 320,
  },
  bottomBar: {
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    gap: spacing.lg,
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  dot: {
    height: 6,
    borderRadius: radius.pill,
  },
  dotActive: {
    width: 24,
    backgroundColor: colors.accent,
  },
  dotInactive: {
    width: 6,
    backgroundColor: colors.border,
  },
  actionBtn: {
    width: "100%",
  },
});
