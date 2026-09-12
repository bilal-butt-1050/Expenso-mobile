import React, { useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useCategories } from "../../hooks/useCategories";
import { useExpenses } from "../../hooks/useExpenses";
import { useDashboard } from "../../hooks/useDashboard";
import { useDialog } from "../../context/DialogContext";
import { getErrorMessage } from "../../api/client";
import { TextField } from "../../components/TextField";
import { Button } from "../../components/Button";
import { DatePicker } from "../../components/DatePicker";
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

const PAYMENT_METHODS: PaymentMethod[] = ["Cash", "Bank Transfer", "Card", "Cheque"];
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
  const [date, setDate] = useState<Date>(editing ? new Date(editing.date) : new Date());
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [budgetAlert, setBudgetAlert] = useState<BudgetAlertInfo | null>(null);

  const selectedCategory = (categories ?? []).find((c) => c.id === categoryId);
  const filteredCategories = (categories ?? []).filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const handleSave = async (forceSave = false) => {
    setError(null);
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }
    if (!categoryId) {
      setError("Please select a category");
      return;
    }

    try {
      setIsSaving(true);
      const parsedAmount = Number(amount);
      const input = {
        categoryId,
        date: date.toISOString(),
        description: description || undefined,
        amount: parsedAmount,
        paymentMethod,
        needWant,
        status,
      };

      const budgetItem = dashboardData?.budgetVsActual.find((b) => b.categoryId === categoryId);
      const diff = editing ? parsedAmount - editing.amount : parsedAmount;
      const newActual = (budgetItem?.actual ?? 0) + diff;

      // Warn BEFORE saving
      if (!forceSave && budgetItem && budgetItem.budget > 0) {
        if (newActual > budgetItem.budget) {
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
      if (editing) {
        await editExpense(editing.id, input);
      } else {
        await addExpense(input);
      }

      showToast({ message: editing ? "Expense updated" : "Expense logged", type: "success" });
      setBudgetAlert(null);
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
      message: "This action cannot be undone.",
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
          { paddingBottom: Math.max(insets.bottom, 24) },
        ]}
        keyboardShouldPersistTaps="handled"
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        <TextField
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={setAmount}
          placeholder="Amount (PKR)"
        />

        <TextField
          value={description}
          onChangeText={setDescription}
          placeholder="Description (optional)"
          maxLength={60}
          numberOfLines={1}
        />

        {/* Category Dropdown */}
        <View style={styles.fieldWrap}>
          <TouchableOpacity
            style={styles.dropdownTrigger}
            onPress={() => { setSearchQuery(""); setIsPickerOpen(true); }}
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
        <DatePicker value={date} onChange={setDate} label="Date" />

        <SegmentedControl label="Payment Method" options={PAYMENT_METHODS} value={paymentMethod} onChange={setPaymentMethod} />
        <SegmentedControl label="Need or Want" options={NEED_WANT} value={needWant} onChange={setNeedWant} />
        <SegmentedControl label="Status" options={STATUSES} value={status} onChange={setStatus} />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button label={editing ? "Save Changes" : "Add Expense"} onPress={() => handleSave(false)} loading={isSaving} />

        {editing && (
          <Button label="Delete" variant="danger" onPress={handleDelete} style={{ marginTop: spacing.sm }} />
        )}
      </ScrollView>

      {/* Category Sheet */}
      <Modal visible={isPickerOpen} transparent animationType="slide" onRequestClose={() => setIsPickerOpen(false)}>
        <TouchableOpacity style={styles.sheetBackdrop} activeOpacity={1} onPress={() => setIsPickerOpen(false)}>
          <TouchableOpacity
            activeOpacity={1}
            style={[styles.sheetContent, { paddingBottom: Math.max(insets.bottom, 16) + spacing.md }]}
          >
            <View style={styles.sheetDragHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Category</Text>
              <TouchableOpacity onPress={() => setIsPickerOpen(false)} hitSlop={12}>
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

            <ScrollView style={styles.optionList} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {filteredCategories.map((c) => {
                const isSelected = c.id === categoryId;
                return (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.optionRow, isSelected && styles.optionRowSelected]}
                    onPress={() => { setCategoryId(c.id); setIsPickerOpen(false); }}
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
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Budget Alert Modal */}
      <Modal
        visible={Boolean(budgetAlert)}
        transparent
        animationType="fade"
        onRequestClose={() => { setBudgetAlert(null); navigation.goBack(); }}
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
                onPress={() => { setBudgetAlert(null); navigation.navigate("Tabs", { screen: "Budget" } as any); }}
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

  sheetBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
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
    backgroundColor: "rgba(255,255,255,0.2)",
    alignSelf: "center",
    marginBottom: spacing.sm,
  },
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
  optionList: { maxHeight: 340 },
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
    flexDirection: "row",
    gap: spacing.sm,
    width: "100%",
    marginTop: spacing.xs,
  },
});
