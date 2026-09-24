import React, { useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Keyboard
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { TabActions } from "@react-navigation/native";
import { useAuth } from "../../context/AuthContext";
import { useCategories } from "../../hooks/useCategories";
import { useExpenses } from "../../hooks/useExpenses";
import { useDashboard } from "../../hooks/useDashboard";
import { useAppData } from "../../context/AppDataContext";
import { useDialog } from "../../context/DialogContext";
import { useBudgets } from "../../hooks/useBudgets";
import { getErrorMessage } from "../../api/client";
import { TextField } from "../../components/TextField";
import { Button } from "../../components/Button";
import { DatePicker } from "../../components/DatePicker";
import { CategoryPill } from "../../components/CategoryPill";
import { BottomSheet } from "../../components/BottomSheet";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { NeedWant, PaymentMethod } from "../../types/models";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatCurrency, formatAmountInput } from "../../utils/currency";
import { RootStackParamList } from "../../types/navigation";
import { hapticRecordCreated, hapticDelete, hapticError, hapticWarning } from "../../utils/haptics";

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

const PAYMENT_METHODS: PaymentMethod[] = ["Cash", "Bank Transfer", "Card", "Cheque"];
const NEED_WANT: NeedWant[] = ["Need", "Want"];

export function ExpenseFormScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const editing = route.params?.expense;
  const { user } = useAuth();
  const { data: categories } = useCategories();

  const [date, setDate] = useState<Date>(editing ? new Date(editing.date) : new Date());
  const expenseMonth = date.toISOString().slice(0, 7);

  const { data: dashboardData } = useDashboard(expenseMonth);
  const { addExpense, editExpense, removeExpense } = useExpenses();
  const { setSelectedMonth } = useAppData();
  const { confirm, alert } = useDialog();

  const { setBudget } = useBudgets(expenseMonth);

  const [categoryId, setCategoryId] = useState(editing?.categoryId ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [amount, setAmount] = useState(editing ? formatAmountInput(String(editing.amount)) : "");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(editing?.paymentMethod ?? "Cash");
  const [needWant, setNeedWant] = useState<NeedWant>(editing?.needWant ?? "Need");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [isBudgetSheetOpen, setIsBudgetSheetOpen] = useState(false);
  const [budgetInputValue, setBudgetInputValue] = useState("");
  const [isSavingBudget, setIsSavingBudget] = useState(false);

  const hasChanges = React.useMemo(() => {
    if (!editing) return true;
    if (categoryId !== editing.categoryId) return true;
    if (description !== (editing.description ?? "")) return true;
    const parsedAmount = Number(amount.replace(/,/g, ""));
    if (!isNaN(parsedAmount) && parsedAmount !== editing.amount) return true;
    if (paymentMethod !== editing.paymentMethod) return true;
    if (needWant !== editing.needWant) return true;
    if (date.toISOString().split("T")[0] !== new Date(editing.date).toISOString().split("T")[0]) return true;
    return false;
  }, [editing, categoryId, description, amount, paymentMethod, needWant, date]);

  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const openSheet = React.useCallback(() => {
    Keyboard.dismiss();
    setSearchQuery("");
    setIsPickerOpen(true);
  }, []);

  const closeSheet = React.useCallback(() => {
    setIsPickerOpen(false);
  }, []);

  const [budgetAlert, setBudgetAlert] = useState<BudgetAlertInfo | null>(null);

  const selectedCategory = (categories ?? []).find((c) => c.id === categoryId);
  const filteredCategories = (categories ?? [])
    .filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase().trim()))
    .sort((a, b) => {
      const aSpent = dashboardData?.budgetVsActual.find((x) => x.categoryId === a.id)?.actual ?? 0;
      const bSpent = dashboardData?.budgetVsActual.find((x) => x.categoryId === b.id)?.actual ?? 0;
      if (bSpent !== aSpent) return bSpent - aSpent;
      return a.name.localeCompare(b.name);
    });

  const handleSave = async (forceSave = false) => {
    setError(null);
    const parsedAmount = Number(amount.replace(/,/g, ""));
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Please enter a valid amount");
      return;
    }
    if (!categoryId) {
      setError("Please select a category");
      return;
    }

    try {
      setIsSaving(true);
      const parsedAmount = Number(amount.replace(/,/g, ""));
      const input = {
        categoryId,
        date: date.toISOString(),
        description: description || undefined,
        amount: parsedAmount,
        paymentMethod,
        needWant,
      };

      const budgetItem = dashboardData?.budgetVsActual.find((b) => b.categoryId === categoryId);

      // No "you haven't set a budget" interruption. It fired on *every* save into an
      // unbudgeted category — including edits to months-old expenses — turning a three-tap
      // action into a modal dismissal, forever, with no way to opt out. Budgets are set on the
      // Budget screen, which is one tab away and exists for exactly that.

      const diff = editing ? parsedAmount - editing.amount : parsedAmount;
      const newActual = (budgetItem?.actual ?? 0) + diff;

      // Warn BEFORE saving
      if (!forceSave && budgetItem && budgetItem.budget > 0) {
        if (newActual > budgetItem.budget) {
          hapticWarning();
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
          setIsSaving(false);
          return;
        } else if (
          newActual >= budgetItem.budget * 0.8 &&
          (budgetItem.actual ?? 0) < budgetItem.budget * 0.8
        ) {
          hapticWarning();
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
          setIsSaving(false);
          return;
        }
      }

      // Actually save the expense
      let newExpenseId: string | undefined;
      if (editing) {
        await editExpense(editing.id, input);
      } else {
        const result = await addExpense(input);
        newExpenseId = result.id;
      }

      hapticRecordCreated();
      setBudgetAlert(null);
      
      // Switch to the month of the new expense so the user can see it
      const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}`;
      setSelectedMonth(monthKey);

      navigation.dispatch(TabActions.jumpTo("Activity", { highlightId: editing ? editing.id : newExpenseId, filter: "EXPENSES" }));
      navigation.goBack();
    } catch (err) {
      hapticError();
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = React.useCallback(() => {
    if (!editing) return;
    confirm({
      title: "Delete this expense?",
      message: "This action cannot be undone.",
      confirmText: "Delete",
      destructive: true,
      icon: "trash-can-outline",
      onConfirm: async () => {
        hapticDelete();
        await removeExpense(editing.id);
        navigation.goBack();
      },
    });
  }, [editing, confirm, removeExpense, navigation]);

  React.useLayoutEffect(() => {
    if (editing) {
      navigation.setOptions({
        headerRight: () => (
          <TouchableOpacity onPress={handleDelete} hitSlop={12} accessibilityRole="button" style={{ marginRight: spacing.sm }}>
            <MaterialCommunityIcons name="trash-can-outline" size={24} color={colors.danger} />
          </TouchableOpacity>
        ),
      });
    }
  }, [navigation, editing, handleDelete]);

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 24) },
        ]}
        keyboardShouldPersistTaps="handled"
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        <TextField
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={(val) => setAmount(formatAmountInput(val))}
          placeholder={`Amount (${user?.currency || "PKR"})`}
        />

        <TextField
          value={description}
          onChangeText={setDescription}
          placeholder="Description (optional)"
          maxLength={40}
          numberOfLines={1}
        />

        {/* Category Dropdown */}
        <View style={styles.fieldWrap}>
          <TouchableOpacity
            style={styles.dropdownTrigger}
            onPress={openSheet}
            activeOpacity={0.7}
          >
            {selectedCategory ? (
              <View style={styles.dropdownSelectedRow}>
                <CategoryPill icon={selectedCategory.icon} color={selectedCategory.color} size={28} />
                <Text style={styles.dropdownText}>{selectedCategory.name}</Text>
              </View>
            ) : (
              <Text style={styles.dropdownPlaceholder}>Category</Text>
            )}
            <MaterialCommunityIcons name="chevron-down" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Date */}
        <DatePicker value={date} onChange={setDate} label="Date" maxDate={new Date()} />

        <SegmentedControl label="Payment Method" options={PAYMENT_METHODS} value={paymentMethod} onChange={setPaymentMethod} />
        <SegmentedControl label="Need or Want" options={NEED_WANT} value={needWant} onChange={setNeedWant} />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button label={editing ? "Save Changes" : "Add Expense"} onPress={() => handleSave(false)} loading={isSaving} disabled={!hasChanges} />
      </ScrollView>

      {/* Category Sheet */}
      <BottomSheet visible={isPickerOpen} onClose={closeSheet}>
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Category</Text>
          <TouchableOpacity onPress={closeSheet} hitSlop={12}>
            <MaterialCommunityIcons name="close" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {(categories?.length ?? 0) > 5 && (
          <View style={styles.searchBox}>
            <MaterialCommunityIcons name="magnify" size={20} color={colors.textSecondary} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search..."
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

        <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {filteredCategories.map((c) => {
            const isSelected = c.id === categoryId;
            return (
              <TouchableOpacity
                key={c.id}
                style={[styles.optionRow, isSelected && styles.optionRowSelected]}
                onPress={() => {
                  setCategoryId(c.id);
                  closeSheet();
                }}
                activeOpacity={0.7}
              >
                <CategoryPill icon={c.icon} color={c.color} size={32} />
                <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                  {c.name}
                </Text>
                {isSelected && <MaterialCommunityIcons name="check" size={20} color={colors.textPrimary} />}
              </TouchableOpacity>
            );
          })}
          {filteredCategories.length === 0 && (
            <View style={{ paddingVertical: spacing.xl, alignItems: "center" }}>
              <Text style={{ color: colors.textMuted, fontSize: 15 }}>No matching categories</Text>
            </View>
          )}
        </ScrollView>
      </BottomSheet>

      {/* Budget Alert Modal */}
      <Modal
        visible={Boolean(budgetAlert)}
        transparent
        animationType="fade"
        // Dismissing the warning returns to the form. It used to call goBack(), silently
        // throwing away everything the user had typed.
        onRequestClose={() => setBudgetAlert(null)}
      >
        <View style={styles.alertBackdrop}>
          <View style={styles.alertCard}>
            <View style={[styles.alertIconBadge, budgetAlert?.isOver ? styles.alertIconOver : styles.alertIconWarn]}>
              <MaterialCommunityIcons
                name={budgetAlert?.isOver ? "alert-octagon-outline" : "bell-ring-outline"}
                size={32}
                color={budgetAlert?.isOver ? colors.danger : colors.warning}
              />
            </View>

            <Text style={styles.alertTitle}>
              {budgetAlert?.isOver ? "Over Budget" : "Almost There"}
            </Text>

            {budgetAlert && (
              <View style={styles.alertConsole}>
                <View style={styles.alertRow}>
                  <Text style={styles.alertLabel}>Spent</Text>
                  <Text style={[styles.alertValue, { color: budgetAlert.isOver ? colors.danger : colors.warning }]}>
                    {formatCurrency(budgetAlert.actualAfter)}
                  </Text>
                </View>
                <View style={styles.alertRow}>
                  <Text style={styles.alertLabel}>Budget</Text>
                  <Text style={styles.alertValue}>{formatCurrency(budgetAlert.budget)}</Text>
                </View>
                {budgetAlert.isOver && (
                  <View style={styles.alertRow}>
                    <Text style={styles.alertLabel}>Over by</Text>
                    <Text style={[styles.alertValue, { color: colors.danger }]}>
                      +{formatCurrency(budgetAlert.overAmount)}
                    </Text>
                  </View>
                )}
              </View>
            )}

            <View style={styles.alertActions}>
              <View style={{ flexDirection: "row", gap: spacing.sm, marginBottom: spacing.sm }}>
                <Button
                  label="Cancel"
                  variant="secondary"
                  onPress={() => setBudgetAlert(null)}
                  style={{ flex: 1 }}
                />
                <Button
                  label="Add Anyway"
                  onPress={() => handleSave(true)}
                  style={{ flex: 1 }}
                />
              </View>
              <Button
                label="Adjust Budget"
                variant="secondary"
                onPress={() => {
                  if (budgetAlert) {
                    setBudgetInputValue(formatAmountInput(String(budgetAlert.budget)));
                  } else {
                    setBudgetInputValue("");
                  }
                  setBudgetAlert(null);
                  setIsBudgetSheetOpen(true);
                }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Inline Budget Edit Sheet */}
      <BottomSheet visible={isBudgetSheetOpen} onClose={() => setIsBudgetSheetOpen(false)}>
        <View style={{ paddingBottom: spacing.md }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.lg }}>
            <CategoryPill icon={selectedCategory?.icon || "help"} color={selectedCategory?.color} size={38} />
            <Text style={{ ...typography.subtitle, color: colors.textPrimary, fontSize: 20 }}>
              {selectedCategory?.name}
            </Text>
          </View>
          <TextField
            label={`Monthly budget (${user?.currency || "PKR"})`}
            keyboardType="decimal-pad"
            value={budgetInputValue}
            onChangeText={(val) => setBudgetInputValue(formatAmountInput(val))}
            autoFocus
            placeholder="0"
          />
          <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm }}>
            <Button label="Cancel" variant="secondary" onPress={() => setIsBudgetSheetOpen(false)} style={{ flex: 1 }} />
            <Button
              label="Save & Continue"
              loading={isSavingBudget}
              onPress={async () => {
                if (!categoryId) return;
                try {
                  setIsSavingBudget(true);
                  const numValue = Number(budgetInputValue.replace(/,/g, "")) || 0;
                  await setBudget(categoryId, numValue);
                  setIsBudgetSheetOpen(false);
                  // Auto-resume expense saving logic bypass budget constraint check
                  handleSave(true);
                } catch (err: any) {
                  alert({ title: "Couldn't save budget", message: getErrorMessage(err) });
                } finally {
                  setIsSavingBudget(false);
                }
              }}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </BottomSheet>
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
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.segmentRow}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt}
            style={[styles.segment, value === opt && styles.segmentActive]}
            onPress={() => onChange(opt)}
            activeOpacity={0.7}
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
  content: { padding: spacing.lg },
  label: { fontSize: 15, fontWeight: "600", color: colors.textSecondary, marginBottom: spacing.xs },
  fieldWrap: { marginBottom: spacing.md },
  error: { color: colors.danger, marginBottom: spacing.md, fontSize: 14 },

  dropdownTrigger: {
    height: 56,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dropdownSelectedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
  },
  dropdownText: { fontSize: 17, fontWeight: "600", color: colors.textPrimary },
  dropdownPlaceholder: { fontSize: 17, color: colors.textMuted },

  segmentRow: { flexDirection: "row", gap: spacing.xs },
  segment: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  segmentActive: { backgroundColor: "rgba(255,255,255,0.12)", borderColor: colors.borderLight },
  segmentText: { fontSize: 14, fontWeight: "600", color: colors.textSecondary, textAlign: "center" },
  segmentTextActive: { color: colors.textPrimary, fontWeight: "700", textAlign: "center" },

  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  sheetTitle: { fontSize: 18, fontWeight: "700", color: colors.textPrimary },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 48,
    marginBottom: spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 16,
    paddingVertical: 0,
  },
  optionList: {},
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    marginBottom: 4,
  },
  optionRowSelected: { backgroundColor: "rgba(255,255,255,0.08)" },
  optionText: { flex: 1, fontSize: 17, fontWeight: "500", color: colors.textSecondary },
  optionTextSelected: { color: colors.textPrimary, fontWeight: "700" },

  // Budget Alert
  alertBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.78)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
  },
  alertCard: {
    width: "100%",
    backgroundColor: colors.surfaceRaised,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.md,
  },
  alertIconBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  alertIconOver: { backgroundColor: "rgba(255,82,82,0.15)" },
  alertIconWarn: { backgroundColor: "rgba(255,179,0,0.15)" },
  alertTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.textPrimary,
    textAlign: "center",
  },
  alertConsole: {
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  alertRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  alertLabel: { fontSize: 15, fontWeight: "600", color: colors.textSecondary },
  alertValue: { fontSize: 17, fontWeight: "800", color: colors.textPrimary },
  alertActions: {
    flexDirection: "column",
    width: "100%",
    marginTop: spacing.xs,
  },
});
