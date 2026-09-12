import React, { useState, useRef, useEffect, useMemo } from "react";
import { SectionList, StyleSheet, Text, TouchableOpacity, View, Switch, Animated, LayoutAnimation, Modal } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useIncome } from "../../hooks/useIncome";
import { useAppData } from "../../context/AppDataContext";
import { useDialog } from "../../context/DialogContext";
import { ScreenContainer } from "../../components/ScreenContainer";
import { MonthPicker } from "../../components/MonthPicker";
import { EmptyState } from "../../components/EmptyState";
import { ListScreenSkeleton } from "../../components/Skeleton";
import { CategoryPill } from "../../components/CategoryPill";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { formatCurrency } from "../../utils/currency";
import { formatDate } from "../../utils/date";
import { Income, IncomeStatus } from "../../types/models";
import { RootStackParamList } from "../../types/navigation";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Filter = IncomeStatus | "All";

export function IncomeListScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { selectedMonth, setSelectedMonth } = useAppData();
  const { confirm } = useDialog();
  const [filter, setFilter] = useState<Filter>("All");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const { data: allIncomes, isLoading, removeIncome, toggleStatus } = useIncome(
    filter === "All" ? {} : { status: filter }
  );

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

  const totalIncome = allIncomes?.reduce((sum, item) => sum + item.amount, 0) ?? 0;

  const confirmDelete = (income: Income) => {
    confirm({
      title: "Delete income?",
      message: `${income.source} · ${formatCurrency(income.amount)}`,
      confirmText: "Delete",
      destructive: true,
      icon: "trash-can-outline",
      onConfirm: async () => {
        await removeIncome(income.id);
      },
    });
  };

  const handleToggleStatus = async (income: Income) => {
    await toggleStatus(income.id);
  };

  return (
    <ScreenContainer style={styles.noPad}>
      <View style={styles.top}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Income</Text>
          <TouchableOpacity onPress={() => setIsFilterOpen(true)} hitSlop={10}>
            <MaterialCommunityIcons name="filter-variant" size={24} color={filter !== "All" ? colors.accent : colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <MonthPicker month={selectedMonth} onChange={setSelectedMonth} />

        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroLabel}>TOTAL</Text>
          <Text style={styles.heroAmount} numberOfLines={1} adjustsFontSizeToFit>
            {formatCurrency(totalIncome)}
          </Text>
        </View>
      </View>

      <SectionList
        sections={groupedData}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshing={isLoading}
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={
          isLoading ? (
            <ListScreenSkeleton />
          ) : (
            <EmptyState icon="wallet-plus-outline" title="No income this month" />
          )
        }
        renderSectionHeader={({ section: { title } }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{title}</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <IncomeItem
            item={item}
            onPress={() => navigation.navigate("IncomeForm", { income: item })}
            onLongPress={() => confirmDelete(item)}
            onToggleStatus={() => handleToggleStatus(item)}
          />
        )}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("IncomeForm", undefined)}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Add Income"
      >
        <MaterialCommunityIcons name="plus" size={28} color={colors.accentForeground} />
      </TouchableOpacity>
      {isFilterOpen && (
        <FilterSheet
          options={["All", "Received", "Expected"]}
          selected={filter}
          title="Filter Income"
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

function IncomeItem({
  item,
  onPress,
  onLongPress,
  onToggleStatus,
}: {
  item: Income;
  onPress: () => void;
  onLongPress: () => void;
  onToggleStatus: () => void;
}) {
  const [isReceived, setIsReceived] = React.useState(item.status === "Received");

  React.useEffect(() => {
    setIsReceived(item.status === "Received");
  }, [item.status]);

  const handleToggle = () => {
    setIsReceived(!isReceived);
    onToggleStatus();
  };

  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={styles.rowTouchArea}
        onPress={onPress}
        onLongPress={onLongPress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${item.source}, ${formatCurrency(item.amount)}, ${isReceived ? "Received" : "Expected"}`}
      >
        <CategoryPill icon={item.sourceIcon || "cash-multiple"} size={48} />
        <View style={styles.rowMiddle}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {item.description || item.source}
          </Text>
        </View>
      </TouchableOpacity>
      <View style={styles.rowEnd}>
        <Text style={styles.rowAmount}>+{formatCurrency(item.amount)}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
          <Text style={{ fontSize: 15, fontWeight: "600", color: isReceived ? colors.success : colors.warning }}>
            {isReceived ? "Received" : "Expected"}
          </Text>
          <Switch
            value={isReceived}
            onValueChange={handleToggle}
            trackColor={{ false: colors.border, true: colors.success }}
            thumbColor={colors.textPrimary}
            style={{ transform: [{ scale: 0.85 }] }}
          />
        </View>
      </View>
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
    paddingHorizontal: spacing.lg,
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

  statusPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  statusReceived: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.14)",
  },
  statusExpected: {
    backgroundColor: colors.warningMuted,
    borderColor: "rgba(245,158,11,0.25)",
  },
  statusText: { fontSize: 12, fontWeight: "700" },

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
