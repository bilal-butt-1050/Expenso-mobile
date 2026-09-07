import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCategories } from "../../hooks/useCategories";
import { useExpenses } from "../../hooks/useExpenses";
import { useDialog } from "../../context/DialogContext";
import { getErrorMessage } from "../../api/client";
import { TextField } from "../../components/TextField";
import { Button } from "../../components/Button";
import { CategoryPill } from "../../components/CategoryPill";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
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

      <Text style={styles.label}>Category</Text>
      <View style={styles.chipGrid}>
        {(categories ?? []).map((c) => (
          <TouchableOpacity
            key={c.id}
            style={[styles.categoryChip, categoryId === c.id && { borderColor: c.color, borderWidth: 1.5 }]}
            onPress={() => setCategoryId(c.id)}
          >
            <CategoryPill icon={c.icon} color={c.color} size={22} />
            <Text style={styles.categoryChipText}>{c.name}</Text>
          </TouchableOpacity>
        ))}
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
  label: { fontSize: 13, fontWeight: "600", color: colors.textSecondary, marginBottom: spacing.sm },
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.lg },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  categoryChipText: { ...typography.caption, color: colors.textPrimary },
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
