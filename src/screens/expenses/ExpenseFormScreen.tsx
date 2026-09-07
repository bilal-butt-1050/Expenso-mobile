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
import { RootStackParamList } from "../../types/navigation";

type Props = NativeStackScreenProps<RootStackParamList, "ExpenseForm">;

const PAYMENT_METHODS: PaymentMethod[] = ["Cash", "Bank", "Card", "Easypaisa", "JazzCash"];
const NEED_WANT: NeedWant[] = ["Need", "Want"];
const STATUSES: ExpenseStatus[] = ["Paid", "Unpaid"];

export function ExpenseFormScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const editing = route.params?.expense;
  const { data: categories } = useCategories();
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

  const selectedCategory = (categories ?? []).find((c) => c.id === categoryId);
  const filteredCategories = (categories ?? []).filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const dateIso = editing?.date ?? new Date().toISOString();

  const handleSave = async () => {
    const parsedAmount = Number(amount);
    if (!categoryId) return setError("Choose a category");
    if (!parsedAmount || parsedAmount <= 0) return setError("Enter a valid amount");

    setError(null);
    setIsSaving(true);
    try {
      const input = {
        categoryId,
        date: dateIso,
        description: description.trim() || undefined,
        amount: parsedAmount,
        paymentMethod,
        needWant,
        status,
      };
      if (editing) {
        await editExpense(editing.id, input);
        showToast({ message: "Expense updated", type: "success" });
      } else {
        await addExpense(input);
        showToast({ message: "Expense logged", type: "success" });
      }
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
        />

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
});
