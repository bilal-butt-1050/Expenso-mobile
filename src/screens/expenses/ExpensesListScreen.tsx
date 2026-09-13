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
import { MonthPicker } from "../../components/MonthPicker";
import { EmptyState } from "../../components/EmptyState";
import { ListScreenSkeleton } from "../../components/Skeleton";
import { CategoryPill, StatusBadge } from "../../components/CategoryPill";
import { CustomSwitch } from "../../components/CustomSwitch";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { formatCurrency } from "../../utils/currency";
import { formatDate } from "../../utils/date";
import { Expense, ExpenseStatus } from "../../types/models";
import { RootStackParamList } from "../../types/navigation";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Filter = ExpenseStatus | "All";

export function ExpensesListScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<RootStackParamList, "Tabs">>();
  // The highlightId might be nested in the Tabs params if passed that way
  const highlightId = (route.params as any)?.highlightId;
  
  const insets = useSafeAreaInsets();
  const { selectedMonth, setSelectedMonth } = useAppData();
  const { confirm } = useDialog();
  const [filter, setFilter] = useState<Filter>("All");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { data, isLoading, removeExpense, toggleStatus } = useExpenses(
    filter === "All" ? {} : { status: filter }
  );

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

  const handleToggleStatus = async (expense: Expense) => {
    await toggleStatus(expense.id);
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
            <View style={styles.headerRow}>
              <Text style={styles.title}>Expenses</Text>
              <TouchableOpacity onPress={() => setIsFilterOpen(true)} hitSlop={10}>
                <MaterialCommunityIcons name="filter-variant" size={24} color={filter !== "All" ? colors.accent : colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <MonthPicker month={selectedMonth} onChange={setSelectedMonth} />
            <View style={styles.hero}>
              <Text style={styles.heroLabel}>TOTAL</Text>
              <Text style={styles.heroAmount} numberOfLines={1} adjustsFontSizeToFit>
                {formatCurrency(totalExpenses)}
              </Text>
            </View>
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
          <ExpenseItem
            item={item}
            isNewlyAdded={item.id === highlightId}
            isDeleting={item.id === deletingId}
            onDeleteAnimFinish={async () => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              await removeExpense(item.id);
              setDeletingId(null);
            }}
            onPress={() => navigation.navigate("ExpenseForm", { expense: item })}
            onLongPress={() => confirmDelete(item)}
            onToggleStatus={() => handleToggleStatus(item)}
          />
        )}
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
      {isFilterOpen && (
        <FilterSheet
          options={["All", "Unpaid", "Paid"]}
          selected={filter}
          title="Filter Expenses"
          insets={insets}
          onClose={() => setIsFilterOpen(false)}
          onSelect={(f: any) => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setFilter(f as Filter);
          }}
        />
      )}
    </ScreenContainer>
  );
}

function ExpenseItem({
  item,
  isNewlyAdded,
  isDeleting,
  onPress,
  onLongPress,
  onToggleStatus,
  onDeleteAnimFinish,
}: {
  item: Expense;
  isNewlyAdded?: boolean;
  isDeleting?: boolean;
  onPress: () => void;
  onLongPress: () => void;
  onToggleStatus: () => void;
  onDeleteAnimFinish?: () => void;
}) {
  const [isPaid, setIsPaid] = React.useState(item.status === "Paid");
  const highlightAnim = useRef(new Animated.Value(isNewlyAdded ? 1 : 0)).current;
  const deleteAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    setIsPaid(item.status === "Paid");
  }, [item.status]);

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

  const handleToggle = () => {
    setIsPaid(!isPaid);
    onToggleStatus();
  };

  return (
    <View style={{ marginBottom: 8, borderRadius: 16, backgroundColor: colors.danger, overflow: "hidden", justifyContent: "center" }}>
      <View style={{ position: "absolute", right: 24, alignItems: "center", justifyContent: "center" }}>
        <MaterialCommunityIcons name="trash-can-outline" size={26} color="#FFFFFF" />
      </View>
      
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
        accessibilityLabel={`${item.category.name}, ${formatCurrency(item.amount)}, ${isPaid ? "Paid" : "Unpaid"}`}
      >
        <CategoryPill icon={item.category.icon} size={48} />
        <View style={styles.rowMiddle}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {item.description || item.category.name}
          </Text>
        </View>
      </TouchableOpacity>
      <View style={styles.rowEnd}>
        <Text style={styles.rowAmount}>{formatCurrency(item.amount)}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
          <Text style={{ fontSize: 15, fontWeight: "600", color: isPaid ? colors.textPrimary : colors.textSecondary }}>
            {isPaid ? "Paid" : "Unpaid"}
          </Text>
          <CustomSwitch
            value={isPaid}
            onValueChange={handleToggle}
          />
        </View>
      </View>
      </Animated.View>
    </Animated.View>
    </View>
  );
}

function FilterSheet({ options, selected, title, insets, onClose, onSelect }: any) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 250,
      friction: 20,
    }).start();
  }, [anim]);

  const handleClose = (option?: string) => {
    Animated.timing(anim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      onClose();
      if (option !== undefined) onSelect(option);
    });
  };

  return (
    <Modal visible transparent animationType="none" onRequestClose={() => handleClose()}>
      <View style={[StyleSheet.absoluteFill, { zIndex: 999 }]}>
        <Animated.View style={[styles.sheetBackdrop, { opacity: anim, position: "absolute", top: 0, bottom: 0, left: 0, right: 0 }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => handleClose()} />
        </Animated.View>
        <Animated.View
          style={[
            styles.sheetContent,
            {
              position: "absolute", bottom: 0, left: 0, right: 0,
              paddingBottom: Math.max(insets.bottom, 16) + spacing.md,
              transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [400, 0] }) }]
            }
          ]}
        >
          <View style={styles.sheetDragHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{title}</Text>
            <TouchableOpacity onPress={() => handleClose()} hitSlop={12}>
              <MaterialCommunityIcons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          {options.map((f: string) => {
            const isSelected = selected === f;
            return (
              <TouchableOpacity
                key={f}
                style={[styles.optionRow, isSelected && styles.optionRowSelected]}
                onPress={() => handleClose(f)}
                activeOpacity={0.7}
              >
                <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>{f}</Text>
                {isSelected && <MaterialCommunityIcons name="check" size={20} color={colors.textPrimary} />}
              </TouchableOpacity>
            );
          })}
        </Animated.View>
      </View>
    </Modal>
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

  hero: {
    alignItems: "center",
    paddingVertical: spacing.sm,
    gap: 4,
  },
  heroLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textMuted,
    letterSpacing: 1,
  },
  heroAmount: {
    fontSize: 36,
    fontWeight: "800",
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },

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

  sheetBackdrop: {
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  sheetContent: {
    backgroundColor: colors.surfaceRaised,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  sheetDragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginBottom: spacing.md,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  sheetTitle: { fontSize: 18, fontWeight: "700", color: colors.textPrimary },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionRowSelected: { backgroundColor: "rgba(255,255,255,0.03)" },
  optionText: { flex: 1, fontSize: 16, color: colors.textSecondary, fontWeight: "500" },
  optionTextSelected: { color: colors.textPrimary, fontWeight: "700" },
});
