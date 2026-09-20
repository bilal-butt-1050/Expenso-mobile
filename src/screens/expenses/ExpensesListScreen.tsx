import React, { useState, useRef, useEffect, useMemo } from "react";
import { SectionList, StyleSheet, Text, TouchableOpacity, View, Animated, Modal, Easing, LayoutAnimation } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Dimensions } from "react-native";
const SCREEN_WIDTH = Dimensions.get("window").width;
import { useExpenses } from "../../hooks/useExpenses";
import { useAppData } from "../../context/AppDataContext";
import { useDialog } from "../../context/DialogContext";
import { ScreenContainer } from "../../components/ScreenContainer";
import { EmptyState } from "../../components/EmptyState";
import { ListScreenSkeleton } from "../../components/Skeleton";
import { CategoryPill } from "../../components/CategoryPill";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { formatCurrency } from "../../utils/currency";
import { formatDate } from "../../utils/date";
import { Expense } from "../../types/models";
import { RootStackParamList } from "../../types/navigation";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SwipeableExpenseRow } from "../../components/SwipeableExpenseRow";
import { hapticLight } from "../../utils/haptics";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function ExpensesListScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<RootStackParamList, "Tabs">>();
  const highlightId = (route.params as any)?.highlightId;
  const deleteId = (route.params as any)?.deleteId;
  const insets = useSafeAreaInsets();
  
  const { confirm } = useDialog();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [highlightingId, setHighlightingId] = useState<string | null>(null);
  const { data, isLoading, isFetchingMore, loadMore, removeExpense } = useExpenses();

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
    if (!data) return [];
    const sections: { title: string; data: Expense[] }[] = [];
    data.forEach((item) => {
      const dateStr = formatDate(item.date);
      let section = sections.find((s) => s.title === dateStr);
      if (!section) {
        section = { title: dateStr, data: [] };
        sections.push(section);
      }
      section.data.push(item);
    });
    return sections;
  }, [data]);

  const totalExpenses = data?.reduce((sum, item) => sum + item.amount, 0) ?? 0;

  const confirmDelete = (expense: Expense) => {
    confirm({
      title: "Delete expense?",
      message: `${expense.category.name} · ${formatCurrency(expense.amount)}`,
      confirmText: "Delete",
      destructive: true,
      icon: "trash-can-outline",
      onConfirm: () => {
        setDeletingId(expense.id);
      },
    });
  };

  return (
    <ScreenContainer style={styles.noPad}>
      {isLoading && (!data || data.length === 0) ? (
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
            <Text style={styles.title}>Expenses</Text>
          </View>
        }
        ListEmptyComponent={
          <EmptyState icon="receipt-text-outline" title="No expenses yet" />
        }
        renderSectionHeader={({ section: { title } }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{title}</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <SwipeableExpenseRow
            item={item}
            isNewlyAdded={item.id === highlightingId}
            isDeleting={item.id === deletingId}
            onDeleteAnimFinish={async () => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              await removeExpense(item.id);
              setDeletingId(null);
            }}
            onPress={() => navigation.navigate("ExpenseForm", { expense: item })}
            onLongPress={() => confirmDelete(item)}
            onDelete={() => confirmDelete(item)}
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
        onPress={() => navigation.navigate("ExpenseForm", undefined)}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Add Expense"
      >
        <MaterialCommunityIcons name="plus" size={28} color={colors.accentForeground} />
      </TouchableOpacity>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  noPad: { paddingHorizontal: 0 },
  top: {
    paddingTop: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
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

