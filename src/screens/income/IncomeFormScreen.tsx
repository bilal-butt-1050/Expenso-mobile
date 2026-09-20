import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Keyboard
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { TabActions } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { useIncome } from "../../hooks/useIncome";
import { useAppData } from "../../context/AppDataContext";
import { useDialog } from "../../context/DialogContext";
import { formatCurrency, formatAmountInput } from "../../utils/currency";
import { getErrorMessage } from "../../api/client";
import { TextField } from "../../components/TextField";
import { Button } from "../../components/Button";
import { DatePicker } from "../../components/DatePicker";
import { MonthPicker } from "../../components/MonthPicker";
import { CategoryPill } from "../../components/CategoryPill";
import { BottomSheet } from "../../components/BottomSheet";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { PaymentMethod } from "../../types/models";
import { RootStackParamList } from "../../types/navigation";
import { hapticRecordCreated, hapticDelete, hapticError } from "../../utils/haptics";

type Props = NativeStackScreenProps<RootStackParamList, "IncomeForm">;

interface SourcePreset {
  source: string;
  icon: string;
}

const PRESET_SOURCES: SourcePreset[] = [
  { source: "Salary", icon: "briefcase-outline" },
  { source: "Freelance", icon: "laptop" },
  { source: "Business", icon: "storefront-outline" },
  { source: "Other", icon: "cash-multiple" },
];

const PAYMENT_METHODS: PaymentMethod[] = ["Cash", "Bank Transfer", "Card", "Cheque"];

export function IncomeFormScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const editing = route.params?.income;
  const { addIncome, editIncome, removeIncome } = useIncome();
  const { setSelectedMonth } = useAppData();
  const { confirm } = useDialog();

  const [selectedPreset, setSelectedPreset] = useState<SourcePreset>(
    PRESET_SOURCES.find((p) => p.source === editing?.source) ?? PRESET_SOURCES[0]
  );
  const [amount, setAmount] = useState(editing ? formatAmountInput(String(editing.amount)) : "");
  const [description, setDescription] = useState(editing?.description ?? "");

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    (editing?.paymentMethod as PaymentMethod) ?? "Bank Transfer"
  );
  const [date, setDate] = useState<Date>(editing ? new Date(editing.date) : new Date());

  const hasChanges = React.useMemo(() => {
    if (!editing) return true;
    if (selectedPreset.source !== editing.source) return true;
    if (description !== (editing.description ?? "")) return true;
    const parsedAmount = Number(amount.replace(/,/g, ""));
    if (!isNaN(parsedAmount) && parsedAmount !== editing.amount) return true;
    if (paymentMethod !== editing.paymentMethod) return true;
    if (date.toISOString().split("T")[0] !== new Date(editing.date).toISOString().split("T")[0]) return true;
    return false;
  }, [editing, selectedPreset, description, amount, paymentMethod, date]);

  const { user } = useAuth();
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const openSheet = React.useCallback(() => {
    Keyboard.dismiss();
    setIsPickerOpen(true);
  }, []);

  const closeSheet = React.useCallback(() => {
    setIsPickerOpen(false);
  }, []);

  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    const parsedAmount = Number(amount.replace(/,/g, ""));
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      return setError("Enter a valid amount");
    }

    setError(null);
    setIsSaving(true);
    try {
      const input = {
        date: date.toISOString(),
        source: selectedPreset.source,
        sourceIcon: selectedPreset.icon,
        sourceColor: colors.iconNeutral,
        description: description.trim() || undefined,
        amount: parsedAmount,
        paymentMethod,
      };

      let newIncomeId: string | undefined;
      if (editing) {
        await editIncome(editing.id, input);
      } else {
        const result = await addIncome(input);
        newIncomeId = result.id;
      }

      hapticRecordCreated();

      // Switch to the month of the new income so the user can see it
      const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}`;
      setSelectedMonth(monthKey);

      navigation.dispatch(TabActions.jumpTo("Activity", { highlightId: editing ? editing.id : newIncomeId, filter: "INCOME" }));
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
      title: "Delete this income?",
      message: "This action cannot be undone.",
      confirmText: "Delete",
      destructive: true,
      icon: "trash-can-outline",
      onConfirm: async () => {
        hapticDelete();
        await removeIncome(editing.id);
        navigation.goBack();
      },
    });
  }, [editing, confirm, removeIncome, navigation]);

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

        {/* Source Dropdown */}
        <View style={styles.fieldWrap}>
          <TouchableOpacity
            style={styles.dropdownTrigger}
            onPress={openSheet}
            activeOpacity={0.7}
            accessibilityLabel="Select Income Source"
          >
            <CategoryPill icon={selectedPreset.icon} size={28} />
            <Text style={styles.dropdownText}>{selectedPreset.source}</Text>
            <MaterialCommunityIcons name="chevron-down" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Date */}
        {selectedPreset.source === "Salary" ? (
          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Month</Text>
            <MonthPicker 
              month={`${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}`}
              onChange={(m) => {
                const [year, month] = m.split("-");
                setDate(new Date(Number(year), Number(month) - 1, 1, 12));
              }}
            />
          </View>
        ) : (
          <DatePicker value={date} onChange={setDate} label="Date" maxDate={new Date()} />
        )}


        {/* Payment Method */}
        <View style={styles.fieldWrap}>
          <Text style={styles.label}>Method</Text>
          <View style={styles.segmentRow}>
            {PAYMENT_METHODS.map((method) => {
              const isActive = paymentMethod === method;
              return (
                <TouchableOpacity
                  key={method}
                  style={[styles.segment, isActive && styles.segmentActive]}
                  onPress={() => setPaymentMethod(method)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.segmentText, isActive && styles.segmentTextActive]}>
                    {method}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button
          label={editing ? "Save Changes" : "Log Income"}
          onPress={handleSave}
          loading={isSaving}
          disabled={!hasChanges}
          style={{ marginTop: spacing.sm }}
        />
      </ScrollView>

      {/* Source Sheet */}
      <BottomSheet visible={isPickerOpen} onClose={closeSheet}>
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Source</Text>
          <TouchableOpacity onPress={closeSheet} hitSlop={12}>
            <MaterialCommunityIcons name="close" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {PRESET_SOURCES.map((p) => {
            const isSelected = p.source === selectedPreset.source;
            return (
              <TouchableOpacity
                key={p.source}
                style={[styles.optionRow, isSelected && styles.optionRowSelected]}
                onPress={() => {
                  setSelectedPreset(p);
                  closeSheet();
                }}
                activeOpacity={0.7}
              >
                <CategoryPill icon={p.icon} size={32} />
                <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                  {p.source}
                </Text>
                {isSelected && <MaterialCommunityIcons name="check" size={20} color={colors.textPrimary} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </BottomSheet>
    </>
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
    gap: spacing.sm,
  },
  dropdownText: {
    flex: 1,
    fontSize: 17,
    fontWeight: "600",
    color: colors.textPrimary,
  },

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
  segmentActive: {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderColor: colors.borderLight,
  },
  segmentText: { fontSize: 14, fontWeight: "600", color: colors.textSecondary, textAlign: "center" },
  segmentTextActive: { color: colors.textPrimary, fontWeight: "700", textAlign: "center" },

  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  sheetTitle: { fontSize: 18, fontWeight: "700", color: colors.textPrimary },

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
});
