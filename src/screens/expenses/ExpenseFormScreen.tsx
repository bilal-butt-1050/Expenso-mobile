import React, { useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useCategories } from "../../hooks/useCategories";
import { useExpenses } from "../../hooks/useExpenses";
import { useDashboard } from "../../hooks/useDashboard";
import { useDialog } from "../../context/DialogContext";
import { getErrorMessage } from "../../api/client";
import { TextField } from "../../components/TextField";
import { Button } from "../../components/Button";
import { CategoryPill } from "../../components/CategoryPill";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { NeedWant, PaymentMethod, ExpenseStatus } from "../../types/models";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatCurrency } from "../../utils/currency";
import { RootStackParamList } from "../../types/navigation";

type Props = NativeStackScreenProps<RootStackParamList, "ExpenseForm">;

interface BudgetAlertInfo {
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  budget: number;
  actualBefore: number;
  actualAfter: number;
  isOver: boolean;
  overAmount: number;
  pct: number;
}

const PAYMENT_METHODS: PaymentMethod[] = ["Card", "Bank Transfer", "Cash", "Cheque"];
const NEED_WANT: NeedWant[] = ["Need", "Want"];
const STATUSES: ExpenseStatus[] = ["Paid", "Unpaid"];

export function ExpenseFormScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const editing = route.params?.expense;
  const { data: categories } = useCategories();
  const { data: dashboardData } = useDashboard();
  const { addExpense, editExpense, removeExpense } = useExpenses();
  const { confirm, showToast } = useDialog();

  const [categoryId, setCategoryId] = useState(editing?.categoryId ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [amount, setAmount] = useState(editing ? String(editing.amount) : "");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(editing?.paymentMethod ?? "Cash");
  const [needWant, setNeedWant] = useState<NeedWant>(editing?.needWant ?? "Need");
  const [status, setStatus] = useState<ExpenseStatus>(editing?.status ?? "Paid");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Category Dropdown Sheet State
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Executive Budget Alert Modal State
  const [budgetAlert, setBudgetAlert] = useState<BudgetAlertInfo | null>(null);

  const selectedCategory = (categories ?? []).find((c) => c.id === categoryId);
  const filteredCategories = (categories ?? []).filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const [date, setDate] = useState<Date>(editing ? new Date(editing.date) : new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) setDate(selectedDate);
  };

  const handleSave = async () => {
    const parsedAmount = Number(amount);
    if (!categoryId) return setError("Choose a category");
    if (!parsedAmount || parsedAmount <= 0) return setError("Enter a valid amount");

    setError(null);
    setIsSaving(true);
    try {
      const input = {
        categoryId,
        date: date.toISOString(),
        description: description.trim() || undefined,
        amount: parsedAmount,
        paymentMethod,
        needWant,
        status,
      };

      const budgetItem = dashboardData?.budgetVsActual.find((b) => b.categoryId === categoryId);
      const diff = editing ? parsedAmount - editing.amount : parsedAmount;
      const newActual = (budgetItem?.actual ?? 0) + diff;

      if (editing) {
        await editExpense(editing.id, input);
      } else {
        await addExpense(input);
      }

      // If budget threshold crossed, pause and show prominent executive modal!
      if (budgetItem && budgetItem.budget > 0 && newActual > budgetItem.budget) {
        setBudgetAlert({
          categoryName: budgetItem.name,
          categoryIcon: budgetItem.icon,
          categoryColor: budgetItem.color,
          budget: budgetItem.budget,
          actualBefore: budgetItem.actual,
          actualAfter: newActual,
          isOver: true,
          overAmount: newActual - budgetItem.budget,
          pct: (newActual / budgetItem.budget) * 100,
        });
        return;
      } else if (
        budgetItem &&
        budgetItem.budget > 0 &&
        newActual >= budgetItem.budget * 0.8 &&
        (budgetItem.actual ?? 0) < budgetItem.budget * 0.8
      ) {
        setBudgetAlert({
          categoryName: budgetItem.name,
          categoryIcon: budgetItem.icon,
          categoryColor: budgetItem.color,
          budget: budgetItem.budget,
          actualBefore: budgetItem.actual,
          actualAfter: newActual,
          isOver: false,
          overAmount: 0,
          pct: (newActual / budgetItem.budget) * 100,
        });
        return;
      }

      showToast({ message: editing ? "Expense updated" : "Expense logged", type: "success" });
      navigation.goBack();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (!editing) return;
    confirm({
      title: "Delete this expense?",
      message: "This expense will be permanently removed.",
      confirmText: "Delete",
      destructive: true,
      icon: "trash-can-outline",
      onConfirm: async () => {
        await removeExpense(editing.id);
        showToast({ message: "Expense deleted", type: "success" });
        navigation.goBack();
      },
    });
  };

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 24) + spacing.xxl + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <TextField
          label="Amount (PKR)"
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={setAmount}
          placeholder="0"
        />
        <TextField
          label="Description (optional)"
          value={description}
          onChangeText={setDescription}
          placeholder="e.g. Lunch at restaurant"
          accessibilityLabel="Expense Description"
        />

        <View style={styles.dropdownWrapper}>
          <Text style={styles.label}>Date</Text>
          <TouchableOpacity
            style={[styles.dropdownTrigger, styles.dateTrigger]}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.7}
            accessibilityLabel="Select Date"
            accessibilityHint="Opens date picker to select expense date"
          >
            <View style={styles.dropdownSelectedRow}>
              <MaterialCommunityIcons name="calendar" size={24} color={colors.textSecondary} />
              <Text style={styles.dropdownSelectedText}>{date.toISOString().split('T')[0]}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-down" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display="default"
            onChange={onDateChange}
          />
        )}

        {/* Clean Category Dropdown Selector */}
        <View style={styles.dropdownWrapper}>
          <Text style={styles.label}>Category</Text>
          <TouchableOpacity
            style={[styles.dropdownTrigger, !selectedCategory && styles.dropdownTriggerEmpty]}
            onPress={() => {
              setSearchQuery("");
              setIsPickerOpen(true);
            }}
            activeOpacity={0.7}
          >
            {selectedCategory ? (
              <View style={styles.dropdownSelectedRow}>
                <CategoryPill icon={selectedCategory.icon} color={selectedCategory.color} size={24} />
                <Text style={styles.dropdownSelectedText}>{selectedCategory.name}</Text>
              </View>
            ) : (
              <Text style={styles.dropdownPlaceholderText}>Select a category</Text>
            )}
            <MaterialCommunityIcons name="chevron-down" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <SegmentedControl label="Payment Method" options={PAYMENT_METHODS} value={paymentMethod} onChange={setPaymentMethod} />
        <SegmentedControl label="Need or Want" options={NEED_WANT} value={needWant} onChange={setNeedWant} />
        <SegmentedControl label="Status" options={STATUSES} value={status} onChange={setStatus} />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button label={editing ? "Save Changes" : "Add Expense"} onPress={handleSave} loading={isSaving} />

        {editing ? (
          <Button label="Delete Expense" variant="danger" onPress={handleDelete} style={{ marginTop: spacing.md }} />
        ) : null}
      </ScrollView>

      {/* Themed Category Selection Bottom Sheet Modal */}
      <Modal
        visible={isPickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsPickerOpen(false)}
      >
        <TouchableOpacity
          style={styles.sheetBackdrop}
          activeOpacity={1}
          onPress={() => setIsPickerOpen(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={[
              styles.sheetContent,
              { paddingBottom: Math.max(insets.bottom, 16) + spacing.md },
            ]}
          >
            <View style={styles.sheetDragHandle} />

            <View style={styles.sheetHeaderRow}>
              <Text style={styles.sheetTitle}>Select Category</Text>
              <TouchableOpacity
                onPress={() => setIsPickerOpen(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialCommunityIcons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {(categories?.length ?? 0) > 5 && (
              <View style={styles.searchBox}>
                <MaterialCommunityIcons name="magnify" size={20} color={colors.textSecondary} />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search category..."
                  placeholderTextColor={colors.textMuted}
                  style={styles.searchInput}
                  autoCorrect={false}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery("")}>
                    <MaterialCommunityIcons name="close-circle" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
            )}

            <ScrollView
              style={styles.categoryList}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {filteredCategories.map((c) => {
                const isSelected = c.id === categoryId;
                return (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.categoryOption, isSelected && styles.categoryOptionSelected]}
                    onPress={() => {
                      setCategoryId(c.id);
                      setIsPickerOpen(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.categoryOptionLeft}>
                      <CategoryPill icon={c.icon} color={c.color} size={26} />
                      <Text
                        style={[
                          styles.categoryOptionText,
                          isSelected && styles.categoryOptionTextSelected,
                        ]}
                      >
                        {c.name}
                      </Text>
                    </View>
                    {isSelected && (
                      <MaterialCommunityIcons name="check" size={20} color={colors.accent} />
                    )}
                  </TouchableOpacity>
                );
              })}

              {filteredCategories.length === 0 && (
                <View style={styles.noResultsWrap}>
                  <Text style={styles.noCategoriesText}>No matching categories found</Text>
                </View>
              )}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Prominent Executive Real-Time Budget Alert Modal */}
      <Modal
        visible={Boolean(budgetAlert)}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setBudgetAlert(null);
          navigation.goBack();
        }}
      >
        <View style={styles.alertModalBackdrop}>
          <View
            style={[
              styles.alertModalCard,
              budgetAlert?.isOver ? styles.alertCardOver : styles.alertCardWarning,
            ]}
          >
            {/* Pulsing Icon Badge */}
            <View
              style={[
                styles.alertIconBadge,
                budgetAlert?.isOver ? styles.alertIconBadgeOver : styles.alertIconBadgeWarning,
              ]}
            >
              <MaterialCommunityIcons
                name={budgetAlert?.isOver ? "alert-octagon-outline" : "bell-ring-outline"}
                size={34}
                color={budgetAlert?.isOver ? colors.danger : colors.warning}
              />
            </View>

            {/* Alert Title & Descriptive Subtitle */}
            <Text style={styles.alertHeaderTitle}>
              {budgetAlert?.isOver ? "Budget Limit Exceeded!" : "Budget Threshold Alert"}
            </Text>
            <Text style={styles.alertHeaderDesc}>
              {budgetAlert?.isOver
                ? "This expense pushes your spending over your allocated monthly budget."
                : "You have consumed 80%+ of your planned monthly budget for this category."}
            </Text>

            {/* Category & Spending Breakdown Console */}
            {budgetAlert && (
              <View style={styles.alertConsole}>
                {/* Category Header Row */}
                <View style={styles.alertConsoleTop}>
                  <View style={styles.alertCategoryInfo}>
                    <CategoryPill
                      icon={budgetAlert.categoryIcon}
                      color={budgetAlert.categoryColor}
                      size={32}
                    />
                    <Text style={styles.alertCategoryName}>{budgetAlert.categoryName}</Text>
                  </View>
                  <View
                    style={[
                      styles.alertStatusPill,
                      budgetAlert.isOver ? styles.alertStatusPillOver : styles.alertStatusPillWarning,
                    ]}
                  >
                    <Text
                      style={[
                        styles.alertStatusPillText,
                        budgetAlert.isOver ? styles.alertStatusTextOver : styles.alertStatusTextWarning,
                      ]}
                    >
                      {budgetAlert.isOver ? "OVER BUDGET" : `${budgetAlert.pct.toFixed(0)}% SPENT`}
                    </Text>
                  </View>
                </View>

                {/* 6px Live Progress Bar */}
                <View style={styles.alertProgressTrackBg}>
                  <View
                    style={[
                      styles.alertProgressTrackFill,
                      {
                        width: `${Math.min(100, budgetAlert.pct)}%`,
                        backgroundColor: budgetAlert.isOver ? colors.danger : colors.warning,
                      },
                    ]}
                  />
                </View>

                {/* Figures Comparison Row */}
                <View style={styles.alertFiguresRow}>
                  <View style={styles.alertFigureCol}>
                    <Text style={styles.alertFigureLabel}>TOTAL SPENT</Text>
                    <Text
                      style={[
                        styles.alertFigureValue,
                        { color: budgetAlert.isOver ? colors.danger : colors.warning },
                      ]}
                    >
                      {formatCurrency(budgetAlert.actualAfter)}
                    </Text>
                  </View>

                  <View style={styles.alertFigureDivider} />

                  <View style={styles.alertFigureCol}>
                    <Text style={styles.alertFigureLabel}>MONTHLY BUDGET</Text>
                    <Text style={styles.alertFigureValue}>{formatCurrency(budgetAlert.budget)}</Text>
                  </View>

                  {budgetAlert.isOver && (
                    <>
                      <View style={styles.alertFigureDivider} />
                      <View style={styles.alertFigureCol}>
                        <Text style={styles.alertFigureLabel}>OVER BY</Text>
                        <Text style={[styles.alertFigureValue, { color: colors.danger }]}>
                          +{formatCurrency(budgetAlert.overAmount)}
                        </Text>
                      </View>
                    </>
                  )}
                </View>
              </View>
            )}

            {/* Interactive Actions */}
            <View style={styles.alertActions}>
              <Button
                label="View Budget"
                variant="secondary"
                onPress={() => {
                  setBudgetAlert(null);
                  navigation.navigate("Tabs", { screen: "Budget" } as any);
                }}
                style={{ flex: 1 }}
              />
              <Button
                label="Got It, Continue"
                onPress={() => {
                  setBudgetAlert(null);
                  showToast({
                    message: editing ? "Expense updated" : "Expense logged",
                    type: "success",
                  });
                  navigation.goBack();
                }}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={{ marginBottom: spacing.lg }}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.segmentRow}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt}
            style={[styles.segment, value === opt && styles.segmentActive]}
            onPress={() => onChange(opt)}
          >
            <Text style={[styles.segmentText, value === opt && styles.segmentTextActive]}>{opt}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  label: { fontSize: 15, fontWeight: "600", color: colors.textSecondary, marginBottom: spacing.xs },

  // Dropdown Field Styles
  dropdownWrapper: { marginBottom: spacing.md },
  dropdownTrigger: {
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dropdownTriggerEmpty: {
    borderColor: colors.border,
  },
  dropdownSelectedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm + 2,
    flex: 1,
  },
  dropdownSelectedText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  dropdownPlaceholderText: {
    fontSize: 16,
    color: colors.textMuted,
  },
  dateTrigger: {
    paddingHorizontal: spacing.md,
  },

  // Modal Bottom Sheet Styles
  sheetBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "flex-end",
  },
  sheetContent: {
    backgroundColor: colors.surfaceRaised,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: "72%",
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  sheetDragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignSelf: "center",
    marginBottom: spacing.sm,
  },
  sheetHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.xs,
    marginBottom: spacing.sm,
  },
  sheetTitle: {
    ...typography.subtitle,
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 44,
    marginBottom: spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 15,
    paddingVertical: 0,
  },
  categoryList: {
    maxHeight: 320,
    marginTop: spacing.xs,
  },
  categoryOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    marginBottom: 4,
  },
  categoryOptionSelected: {
    backgroundColor: "rgba(0, 230, 118, 0.1)",
  },
  categoryOptionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    flex: 1,
  },
  categoryOptionText: {
    fontSize: 16,
    fontWeight: "500",
    color: colors.textSecondary,
  },
  categoryOptionTextSelected: {
    color: colors.textPrimary,
    fontWeight: "700",
  },
  noResultsWrap: {
    paddingVertical: spacing.xl,
    alignItems: "center",
  },
  noCategoriesText: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: "center",
  },

  // Segmented Control Styles
  segmentRow: { flexDirection: "row", gap: spacing.sm },
  segment: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  segmentActive: { backgroundColor: colors.accentMuted, borderColor: colors.accent },
  segmentText: { ...typography.caption },
  segmentTextActive: { color: colors.accent, fontWeight: "700" },
  error: { color: colors.danger, marginBottom: spacing.md, fontSize: 13 },

  // Executive Budget Alert Modal Styles
  alertModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.78)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
  },
  alertModalCard: {
    width: "100%",
    backgroundColor: colors.surfaceRaised,
    borderRadius: 24,
    borderWidth: 1.5,
    padding: spacing.lg + 2,
    alignItems: "center",
    gap: spacing.sm,
  },
  alertCardOver: {
    borderColor: "rgba(255, 82, 82, 0.45)",
  },
  alertCardWarning: {
    borderColor: "rgba(255, 179, 0, 0.45)",
  },
  alertIconBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  alertIconBadgeOver: {
    backgroundColor: "rgba(255, 82, 82, 0.15)",
  },
  alertIconBadgeWarning: {
    backgroundColor: "rgba(255, 179, 0, 0.15)",
  },
  alertHeaderTitle: {
    ...typography.title,
    fontSize: 20,
    fontWeight: "800",
    color: colors.textPrimary,
    textAlign: "center",
  },
  alertHeaderDesc: {
    ...typography.caption,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: spacing.sm,
  },

  // Alert Console
  alertConsole: {
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.xs,
    gap: spacing.sm,
  },
  alertConsoleTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  alertCategoryInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
  },
  alertCategoryName: {
    ...typography.body,
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  alertStatusPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  alertStatusPillOver: {
    backgroundColor: "rgba(255, 82, 82, 0.15)",
  },
  alertStatusPillWarning: {
    backgroundColor: "rgba(255, 179, 0, 0.15)",
  },
  alertStatusPillText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  alertStatusTextOver: {
    color: colors.danger,
  },
  alertStatusTextWarning: {
    color: colors.warning,
  },

  alertProgressTrackBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    overflow: "hidden",
  },
  alertProgressTrackFill: {
    height: "100%",
    borderRadius: 3,
  },

  alertFiguresRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingTop: 4,
  },
  alertFigureCol: {
    alignItems: "center",
  },
  alertFigureLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  alertFigureValue: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  alertFigureDivider: {
    width: 1,
    height: 24,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },

  alertActions: {
    flexDirection: "row",
    gap: spacing.sm,
    width: "100%",
    marginTop: spacing.sm,
  },
});
