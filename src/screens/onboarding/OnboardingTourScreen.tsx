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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Svg, { Path, Rect, Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import { RootStackParamList } from "../../types/navigation";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/Button";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { hapticSuccess, hapticLight } from "../../utils/haptics";

const { width } = Dimensions.get("window");

type Props = NativeStackScreenProps<RootStackParamList, "OnboardingTour">;

function CashflowVector() {
  return (
    <Svg width={110} height={110} viewBox="0 0 110 110" fill="none">
      <Defs>
        <LinearGradient id="cfCardGrad" x1="10" y1="20" x2="100" y2="90" gradientUnits="userSpaceOnUse">
          <Stop offset="0%" stopColor="#818CF8" />
          <Stop offset="100%" stopColor="#4F46E5" />
        </LinearGradient>
        <LinearGradient id="cfCoinGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#34D399" />
          <Stop offset="100%" stopColor="#059669" />
        </LinearGradient>
      </Defs>
      <Circle cx="55" cy="55" r="48" fill="rgba(99, 102, 241, 0.12)" />
      <Rect x="20" y="24" width="70" height="44" rx="10" fill="#312E81" opacity="0.6" />
      <Rect x="15" y="36" width="76" height="48" rx="10" fill="url(#cfCardGrad)" />
      <Rect x="23" y="46" width="14" height="10" rx="3" fill="#C7D2FE" opacity="0.8" />
      <Rect x="23" y="66" width="30" height="4" rx="2" fill="#FFFFFF" opacity="0.5" />
      <Rect x="58" y="66" width="22" height="4" rx="2" fill="#FFFFFF" opacity="0.3" />
      <Circle cx="82" cy="74" r="15" fill="url(#cfCoinGrad)" />
      <Path d="M76 74L80 78L88 70" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function BudgetVector() {
  return (
    <Svg width={110} height={110} viewBox="0 0 110 110" fill="none">
      <Defs>
        <LinearGradient id="bgRingGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#A78BFA" />
          <Stop offset="100%" stopColor="#6366F1" />
        </LinearGradient>
      </Defs>
      <Circle cx="55" cy="55" r="48" fill="rgba(99, 102, 241, 0.12)" />
      <Circle cx="55" cy="55" r="36" stroke="rgba(255, 255, 255, 0.1)" strokeWidth="8" strokeDasharray="170 60" />
      <Circle
        cx="55"
        cy="55"
        r="36"
        stroke="url(#bgRingGrad)"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray="140 100"
        transform="rotate(-90 55 55)"
      />
      <Circle cx="55" cy="55" r="16" fill="#1E1B4B" stroke="#6366F1" strokeWidth="2" />
      <Circle cx="55" cy="55" r="6" fill="#A78BFA" />
      <Circle cx="89" cy="40" r="5" fill="#38BDF8" />
    </Svg>
  );
}

function LoansVector() {
  return (
    <Svg width={110} height={110} viewBox="0 0 110 110" fill="none">
      <Defs>
        <LinearGradient id="loanBlueGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#60A5FA" />
          <Stop offset="100%" stopColor="#2563EB" />
        </LinearGradient>
        <LinearGradient id="loanAmberGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#FBBF24" />
          <Stop offset="100%" stopColor="#D97706" />
        </LinearGradient>
      </Defs>
      <Circle cx="55" cy="55" r="48" fill="rgba(59, 130, 246, 0.1)" />
      <Rect x="20" y="32" width="32" height="46" rx="16" fill="url(#loanBlueGrad)" opacity="0.9" />
      <Circle cx="36" cy="46" r="6" fill="#FFFFFF" />
      <Path d="M28 66C28 60 44 60 44 66" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
      <Rect x="58" y="32" width="32" height="46" rx="16" fill="url(#loanAmberGrad)" opacity="0.9" />
      <Circle cx="74" cy="46" r="6" fill="#FFFFFF" />
      <Path d="M66 66C66 60 82 60 82 66" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
      <Path d="M40 24C48 20 62 20 70 24" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round" />
      <Path d="M70 86C62 90 48 90 40 86" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

function ClarityVector() {
  return (
    <Svg width={110} height={110} viewBox="0 0 110 110" fill="none">
      <Defs>
        <LinearGradient id="shieldGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#818CF8" />
          <Stop offset="100%" stopColor="#4338CA" />
        </LinearGradient>
      </Defs>
      <Circle cx="55" cy="55" r="48" fill="rgba(99, 102, 241, 0.12)" />
      <Path
        d="M55 22L78 32V53C78 68 68 81 55 86C42 81 32 68 32 53V32L55 22Z"
        fill="url(#shieldGrad)"
      />
      <Path
        d="M55 26L74 34.5V53C74 65.5 65.5 76.5 55 81C44.5 76.5 36 65.5 36 53V34.5L55 26Z"
        stroke="rgba(255, 255, 255, 0.25)"
        strokeWidth="1.5"
      />
      <Path
        d="M45 54L52 61L66 47"
        stroke="#FFFFFF"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

interface TourSlide {
  id: string;
  Vector: React.ComponentType;
  badgeColor: string;
  title: string;
  description: string;
  features: string[];
}

const SLIDES: TourSlide[] = [
  {
    id: "expenses",
    Vector: CashflowVector,
    badgeColor: colors.accent,
    title: "Track Cashflow Instantly",
    description: "Capture daily expenses and income in seconds with offline-first speed.",
    features: ["⚡ Instant offline entry", "🏷️ Clean categories", "💱 Multi-currency"],
  },
  {
    id: "budget",
    Vector: BudgetVector,
    badgeColor: colors.accent,
    title: "Stay Ahead of Limits",
    description: "Visual spending progress bars keep you conscious before you overspend.",
    features: ["🎯 Category limits", "📊 Real-time pacing", "🛡️ Over-budget alerts"],
  },
  {
    id: "lending",
    Vector: LoansVector,
    badgeColor: "#60A5FA",
    title: "Lend & Borrow Clearly",
    description: "Know exactly who owes you and what you owe, with seamless settlements.",
    features: ["🤝 Real-time debt position", "⏱️ Due date tracking", "💳 Inline settlements"],
  },
  {
    id: "peace",
    Vector: ClarityVector,
    badgeColor: colors.accent,
    title: "Total Financial Clarity",
    description: "Clean monthly snapshots and automatic sync designed for everyday peace of mind.",
    features: ["🔒 100% private & secure", "☁️ Background cloud sync", "🌙 Calm dark aesthetic"],
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
        renderItem={({ item }) => {
          const VectorComponent = item.Vector;
          return (
            <View style={[styles.slideWrap, { width }]}>
              {/* Custom SVG Vector Container */}
              <View style={styles.iconCircleOuter}>
                <VectorComponent />
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
          );
        }}
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
    width: 130,
    height: 130,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xl,
  },
  slideTitle: {
    ...typography.title,
    fontSize: 25,
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
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 24,
    backgroundColor: colors.accent,
  },
  dotInactive: {
    width: 6,
    backgroundColor: colors.surfaceRaised,
  },
  actionBtn: {
    width: "100%",
  },
});
