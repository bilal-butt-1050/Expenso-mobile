import React, { useState, useRef } from "react";
import {
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { RootStackParamList } from "../../types/navigation";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/Button";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { hapticSuccess, hapticLight } from "../../utils/haptics";

const { width } = Dimensions.get("window");

type Props = NativeStackScreenProps<RootStackParamList, "OnboardingTour">;

interface TourSlide {
  id: string;
  icon: string;
  badgeColor: string;
  title: string;
  description: string;
  features: string[];
}

const SLIDES: TourSlide[] = [
  {
    id: "expenses",
    icon: "wallet-outline",
    badgeColor: colors.accent,
    title: "Track Every Rupee",
    description:
      "Capture daily expenses and itemized income in seconds with clean categories and multi-currency support.",
    features: ["⚡ Instant Logging", "🏷️ Custom Categories", "💱 Multi-Currency"],
  },
  {
    id: "budget",
    icon: "chart-donut",
    badgeColor: colors.accent,
    title: "Stay Ahead of Budgets",
    description:
      "Set category spending limits and monitor clean, unified progress bars before you overspend.",
    features: ["🎯 Spending Caps", "📊 Real-Time Progress", "⚠️ Over-Budget Alerts"],
  },
  {
    id: "lending",
    icon: "handshake-outline",
    badgeColor: colors.success,
    title: "Lend & Borrow with Clarity",
    description:
      "Keep track of money you gave to friends or borrowed, with due date tracking and partial payments.",
    features: ["🤝 Who Owes Who", "⏱️ Due Dates", "💳 Partial Payments"],
  },
  {
    id: "peace",
    icon: "shield-check-outline",
    badgeColor: colors.accent,
    title: "Your Finances, Simplified",
    description:
      "Clear monthly snapshots, dark mode elegance, and offline-first speed designed for everyday life.",
    features: ["🔒 Private & Secure", "📈 Net Savings", "⚡ Fast & Offline-Ready"],
  },
];

export function OnboardingTourScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const isFromSettings = route.params?.fromSettings ?? false;

  const handleComplete = async () => {
    hapticSuccess();
    if (user?.id) {
      await AsyncStorage.setItem(`@expenso_tour_completed_${user.id}`, "true");
    }
    if (isFromSettings) {
      navigation.goBack();
    } else {
      navigation.replace("Tabs", { screen: "Home" });
    }
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
    <View style={[styles.root, { paddingTop: Math.max(insets.top, 20) }]}>
      {/* Top Bar: Wordmark & Skip */}
      <View style={styles.topBar}>
        <Text style={styles.brandWordmark}>expenso</Text>

        <TouchableOpacity
          onPress={handleComplete}
          style={styles.skipBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Swipeable Slides */}
      <FlatList
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
        renderItem={({ item }) => (
          <View style={[styles.slideWrap, { width }]}>
            {/* Glowing Icon Container */}
            <View style={styles.iconCircleOuter}>
              <View style={[styles.iconCircleGlow, { backgroundColor: item.badgeColor }]} />
              <View style={styles.iconCircleInner}>
                <MaterialCommunityIcons
                  name={item.icon as any}
                  size={54}
                  color={item.badgeColor}
                />
              </View>
            </View>

            {/* Slide Title & Description */}
            <Text style={styles.slideTitle}>{item.title}</Text>
            <Text style={styles.slideDescription}>{item.description}</Text>

            {/* Feature Pills */}
            <View style={styles.featuresRow}>
              {item.features.map((feature: string, idx: number) => (
                <View key={idx} style={styles.featurePill}>
                  <Text style={styles.featurePillText}>{feature}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      />

      {/* Bottom Controls */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 24) + spacing.md }]}>
        {/* Dot Indicators */}
        <View style={styles.dotsRow}>
          {SLIDES.map((_, idx) => {
            const isActive = idx === activeIndex;
            return (
              <View
                key={idx}
                style={[
                  styles.dot,
                  isActive ? styles.dotActive : styles.dotInactive,
                ]}
              />
            );
          })}
        </View>

        {/* Action Button */}
        <Button
          label={activeIndex === SLIDES.length - 1 ? "Get Started" : "Continue"}
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
    fontSize: 22,
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
    width: 140,
    height: 140,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xl,
  },
  iconCircleGlow: {
    position: "absolute",
    width: 130,
    height: 130,
    borderRadius: 65,
    opacity: 0.15,
  },
  iconCircleInner: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: colors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.borderLight,
    elevation: 8,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  slideTitle: {
    ...typography.title,
    fontSize: 26,
    textAlign: "center",
    letterSpacing: -0.5,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  slideDescription: {
    ...typography.body,
    fontSize: 15,
    textAlign: "center",
    color: colors.textSecondary,
    lineHeight: 22,
    maxWidth: 320,
    marginBottom: spacing.xl,
  },
  featuresRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacing.xs + 2,
    maxWidth: 320,
  },
  featurePill: {
    paddingHorizontal: spacing.md - 2,
    paddingVertical: spacing.xs + 1,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  featurePillText: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textPrimary,
    fontWeight: "600",
  },
  bottomBar: {
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    gap: spacing.lg,
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 24,
    backgroundColor: colors.accent,
  },
  dotInactive: {
    width: 8,
    backgroundColor: colors.surfaceRaised,
  },
  actionBtn: {
    width: "100%",
  },
});
