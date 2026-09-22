import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Animated,
  Dimensions,
  Easing,
  LayoutAnimation,
} from "react-native";

const SCREEN_WIDTH = Dimensions.get("window").width;
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useIncome } from "../../hooks/useIncome";
import { useDialog } from "../../context/DialogContext";
import { ScreenContainer } from "../../components/ScreenContainer";
import { EmptyState } from "../../components/EmptyState";
import { ListScreenSkeleton } from "../../components/Skeleton";
import { CategoryPill } from "../../components/CategoryPill";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { formatCurrency } from "../../utils/currency";
import { formatDate } from "../../utils/date";
import { Income } from "../../types/models";
import { RootStackParamList } from "../../types/navigation";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function IncomeListScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<RootStackParamList, "Tabs">>();
  const highlightId = (route.params as any)?.highlightId;
  const deleteId = (route.params as any)?.deleteId;

  const { confirm } = useDialog();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [highlightingId, setHighlightingId] = useState<string | null>(null);

  const { data: allIncomes, isLoading, isFetchingMore, loadMore, removeIncome } = useIncome();

  React.useEffect(() => {
    if (deleteId && deleteId !== deletingId) {
      setDeletingId(deleteId);
      navigation.setParams({ deleteId: undefined } as any);
    }
  }, [deleteId, deletingId, navigation]);

  React.useEffect(() => {
    if (highlightId) {
      setHighlightingId(highlightId);
      navigation.setParams({ highlightId: undefined } as any);
      setTimeout(() => {
        setHighlightingId(null);
      }, 3000);
    }
  }, [highlightId, navigation]);

  const groupedData = useMemo(() => {
    if (!allIncomes) return [];
    const sections: { title: string; data: Income[] }[] = [];
    allIncomes.forEach((item) => {
      const dateStr = formatDate(item.date);
      let section = sections.find((s) => s.title === dateStr);
      if (!section) {
        section = { title: dateStr, data: [] };
        sections.push(section);
      }
      section.data.push(item);
    });
    return sections;
  }, [allIncomes]);

  const confirmDelete = (income: Income) => {
    confirm({
      title: "Delete income?",
      message: `${income.source} · ${formatCurrency(income.amount)}`,
      confirmText: "Delete",
      destructive: true,
      icon: "trash-can-outline",
      onConfirm: () => {
        setDeletingId(income.id);
      },
    });
  };


  return (
    <ScreenContainer style={styles.noPad}>
      {isLoading && (!allIncomes || allIncomes.length === 0) ? (
        <View style={{ paddingTop: spacing.xl }}>
          <ListScreenSkeleton />
        </View>
      ) : (
        <SectionList
        sections={groupedData}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshing={isLoading}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          <View style={styles.top}>
            <View style={styles.headerRow}>
              <Text style={styles.title}>Income</Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <EmptyState icon="wallet-plus-outline" title="No income this month" />
        }
        renderSectionHeader={({ section: { title } }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{title}</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <IncomeItem
            item={item}
            isNewlyAdded={item.id === highlightingId}
            isDeleting={item.id === deletingId}
            onDeleteAnimFinish={async () => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              await removeIncome(item.id);
              setDeletingId(null);
            }}
            onPress={() => navigation.navigate("IncomeForm", { income: item } as any)}
            onLongPress={() => confirmDelete(item)}
          />
        )}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isFetchingMore ? (
            <View style={{ paddingVertical: spacing.lg }}>
              <ListScreenSkeleton />
            </View>
          ) : null
        }
      />
      )}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("IncomeForm", undefined)}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Add Income"
      >
        <MaterialCommunityIcons name="plus" size={28} color={colors.accentForeground} />
      </TouchableOpacity>

    </ScreenContainer>
  );
}

function IncomeItem({
  item,
  isNewlyAdded,
  isDeleting,
  onPress,
  onLongPress,
  onDeleteAnimFinish,
}: {
  item: Income;
  isNewlyAdded?: boolean;
  isDeleting?: boolean;
  onPress: () => void;
  onLongPress: () => void;
  onDeleteAnimFinish?: () => void;
}) {
  const highlightAnim = useRef(new Animated.Value(isNewlyAdded ? 1 : 0)).current;
  const deleteAnim = useRef(new Animated.Value(0)).current;


  React.useEffect(() => {
    if (isNewlyAdded) {
      Animated.sequence([
        Animated.timing(highlightAnim, { toValue: 1, duration: 0, useNativeDriver: false }),
        Animated.timing(highlightAnim, { toValue: 0, duration: 2000, delay: 500, useNativeDriver: false })
      ]).start();
    }
  }, [isNewlyAdded]);

  React.useEffect(() => {
    if (isDeleting) {
      Animated.sequence([
        Animated.timing(deleteAnim, {
          toValue: 1,
          duration: 350,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true, // NATIVE DRIVER FOR PIXEL PERFECT 60FPS
        })
      ]).start(() => {
        if (onDeleteAnimFinish) onDeleteAnimFinish();
      });
    }
  }, [isDeleting]);


  return (
    <View style={{ marginBottom: 8, borderRadius: 16, backgroundColor: isDeleting ? colors.danger : "transparent", overflow: "hidden", justifyContent: "center" }}>
      {isDeleting && (
        <View style={{ position: "absolute", right: 24, alignItems: "center", justifyContent: "center" }}>
          <MaterialCommunityIcons name="trash-can-outline" size={26} color="#FFFFFF" />
        </View>
      )}
      
      <Animated.View style={{
        transform: [{
          translateX: deleteAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, -SCREEN_WIDTH]
          })
        }]
      }}>
        <Animated.View style={[
          styles.row, 
          { 
            backgroundColor: highlightAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [colors.surfaceRaised, 'rgba(129, 140, 248, 0.2)']
            }),
            marginBottom: 0
          }
        ]}>
          <TouchableOpacity
            style={styles.rowTouchArea}
            delayLongPress={150}
        onPress={onPress}
        onLongPress={onLongPress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${item.source}, ${formatCurrency(item.amount)}`}
      >
        <CategoryPill icon={item.sourceIcon || "cash-multiple"} size={48} />
        <View style={styles.rowMiddle}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {item.source?.toLowerCase().startsWith("loan repayment")
              ? "Loan Repayment"
              : item.source}
          </Text>
        </View>
      </TouchableOpacity>
      <View style={styles.rowEnd}>
        <Text style={styles.rowAmount}>+{formatCurrency(item.amount)}</Text>
      </View>
      </Animated.View>
    </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  noPad: { paddingHorizontal: 0 },
  top: {
    paddingTop: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { ...typography.title },

  list: { paddingHorizontal: spacing.lg, paddingBottom: 100, flexGrow: 1 },
  sectionHeader: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xs,
    backgroundColor: colors.background,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textMuted,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surfaceRaised,
    borderRadius: 16,
    marginBottom: 8,
  },
  rowTouchArea: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  rowMiddle: { flex: 1 },
  rowTitle: { ...typography.body, fontWeight: "600", fontSize: 18 },
  rowSub: { ...typography.caption, color: colors.textMuted, marginTop: 2, fontSize: 14 },
  rowEnd: { alignItems: "flex-end", gap: spacing.xs },
  rowAmount: { fontSize: 19, fontWeight: "700", color: colors.textPrimary },

  fab: {
    position: "absolute",
    right: spacing.lg,
    bottom: spacing.xl,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
});
