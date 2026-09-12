import React, { useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useIncome } from "../../hooks/useIncome";
import { useDialog } from "../../context/DialogContext";
import { getErrorMessage } from "../../api/client";
import { TextField } from "../../components/TextField";
import { Button } from "../../components/Button";
import { CategoryPill } from "../../components/CategoryPill";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { IncomeStatus, PaymentMethod } from "../../types/models";
import { RootStackParamList } from "../../types/navigation";

type Props = NativeStackScreenProps<RootStackParamList, "IncomeForm">;

interface SourcePreset {
  source: string;
  icon: string;
}

const PRESET_SOURCES: SourcePreset[] = [
  { source: "Salary", icon: "briefcase-outline" },
  { source: "Freelance", icon: "laptop" },
  { source: "Business", icon: "storefront-outline" },
  { source: "Investment", icon: "chart-line" },
  { source: "Bonus", icon: "gift-outline" },
  { source: "Rental", icon: "home-city-outline" },
  { source: "Other", icon: "cash-multiple" },
];

const STATUS_OPTIONS: IncomeStatus[] = ["Received", "Expected"];
const PAYMENT_METHODS: PaymentMethod[] = ["Card", "Bank Transfer", "Cash", "Cheque"];

export function IncomeFormScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const editing = route.params?.income;
  const { addIncome, editIncome, removeIncome } = useIncome();
  const { confirm, showToast } = useDialog();

  const [selectedPreset, setSelectedPreset] = useState<SourcePreset>(
    PRESET_SOURCES.find((p) => p.source === editing?.source) ?? PRESET_SOURCES[0]
  );
  const [amount, setAmount] = useState(editing ? String(editing.amount) : "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [status, setStatus] = useState<IncomeStatus>(editing?.status ?? "Received");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>((editing?.paymentMethod as PaymentMethod) ?? "Bank Transfer");
  
  const [date, setDate] = useState<Date>(editing ? new Date(editing.date) : new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) setDate(selectedDate);
  };

  const handleSave = async () => {
    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      return setError("Enter a valid income amount");
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
        status,
        paymentMethod,
      };

      if (editing) {
        await editIncome(editing.id, input);
      } else {
        await addIncome(input);
      }

      showToast({
        message: editing ? "Income updated" : "Income logged successfully",
        type: "success",
      });
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
      title: "Delete this income?",
      message: "This income entry will be permanently removed.",
      confirmText: "Delete",
      destructive: true,
      icon: "trash-can-outline",
      onConfirm: async () => {
        await removeIncome(editing.id);
        showToast({ message: "Income deleted", type: "success" });
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
          accessibilityLabel="Income Amount"
        />

        <TextField
          label="Description / Client / Employer (optional)"
          value={description}
          onChangeText={setDescription}
          placeholder="e.g. Monthly Office Paycheck"
          accessibilityLabel="Income Description"
        />

        {/* Clean Source Dropdown Selector */}
        <View style={styles.dropdownWrapper}>
          <Text style={styles.label}>Income Source</Text>
          <TouchableOpacity
            style={styles.dropdownTrigger}
            onPress={() => setIsPickerOpen(true)}
            activeOpacity={0.7}
            accessibilityLabel="Select Income Source"
          >
            <View style={styles.dropdownSelectedRow}>
              <CategoryPill icon={selectedPreset.icon} size={24} />
              <Text style={styles.dropdownSelectedText}>{selectedPreset.source}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-down" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Date Picker */}
        <View style={styles.dropdownWrapper}>
          <Text style={styles.label}>Date</Text>
          <TouchableOpacity
            style={[styles.dropdownTrigger, styles.dateTrigger]}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.7}
            accessibilityLabel="Select Date"
            accessibilityHint="Opens date picker to select income date"
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

        {/* Status Switcher with Explanation */}
        <View style={styles.sectionWrap}>
          <Text style={styles.label}>Income Status</Text>
          <View style={styles.segmentRow}>
            {STATUS_OPTIONS.map((opt) => {
              const isActive = status === opt;
              const isRec = opt === "Received";
              return (
                <TouchableOpacity
                  key={opt}
                  style={[
                    styles.statusSegment,
                    isActive &&
                      (isRec
                        ? styles.statusSegmentReceived
                        : styles.statusSegmentExpected),
                  ]}
                  onPress={() => setStatus(opt)}
                  activeOpacity={0.7}
                  accessibilityLabel={`Set status to ${opt}`}
                >
                  <MaterialCommunityIcons
                    name={isRec ? "check-circle-outline" : "clock-outline"}
                    size={16}
                    color={
                      isActive
                        ? isRec
                          ? colors.textPrimary
                          : colors.warning
                        : colors.textMuted
                    }
                  />
                  <Text
                    style={[
                      styles.statusSegmentText,
                      isActive &&
                        (isRec
                          ? styles.statusSegmentTextReceived
                          : styles.statusSegmentTextExpected),
                    ]}
                  >
                    {opt === "Received" ? "Received in Hand" : "Expected / Pending"}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.helperTipBox}>
            <MaterialCommunityIcons name="information-outline" size={15} color={colors.textSecondary} />
            <Text style={styles.helperTipText}>
              {status === "Expected"
                ? "Scheduled for the month. Counts toward your budget allocations and pacing before the funds physically arrive."
                : "Already in your account or cash in hand. Counts directly into live Cash in Hand liquidity."}
            </Text>
          </View>
        </View>

        {/* Destination / Payment Method */}
        <View style={styles.sectionWrap}>
          <Text style={styles.label}>Destination Account / Method</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.methodsScroll}
          >
            {PAYMENT_METHODS.map((method) => {
              const isSelected = paymentMethod === method;
              return (
                <TouchableOpacity
                  key={method}
                  style={[styles.methodChip, isSelected && styles.methodChipActive]}
                  onPress={() => setPaymentMethod(method)}
                  activeOpacity={0.7}
                  accessibilityLabel={`Select payment method ${method}`}
                >
                  <Text style={[styles.methodText, isSelected && styles.methodTextActive]}>
                    {method}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button
          label={editing ? "Save Changes" : "Log Income"}
          onPress={handleSave}
          loading={isSaving}
          style={{ marginTop: spacing.xs }}
        />

        {editing ? (
          <Button
            label="Delete Income"
            variant="danger"
            onPress={handleDelete}
            style={{ marginTop: spacing.md }}
          />
        ) : null}
      </ScrollView>

      {/* Themed Source Selection Bottom Sheet Modal */}
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
              <Text style={styles.sheetTitle}>Select Income Source</Text>
              <TouchableOpacity
                onPress={() => setIsPickerOpen(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialCommunityIcons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.categoryList}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {PRESET_SOURCES.map((p) => {
                const isSelected = p.source === selectedPreset.source;
                return (
                  <TouchableOpacity
                    key={p.source}
                    style={[styles.categoryOption, isSelected && styles.categoryOptionSelected]}
                    onPress={() => {
                      setSelectedPreset(p);
                      setIsPickerOpen(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.categoryOptionLeft}>
                      <CategoryPill icon={p.icon} size={26} />
                      <Text
                        style={[
                          styles.categoryOptionText,
                          isSelected && styles.categoryOptionTextSelected,
                        ]}
                      >
                        {p.source}
                      </Text>
                    </View>
                    {isSelected && (
                      <MaterialCommunityIcons name="check" size={20} color={colors.textPrimary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  label: { fontSize: 15, fontWeight: "600", color: colors.textSecondary, marginBottom: spacing.xs },
  sectionWrap: { marginBottom: spacing.lg },

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
    backgroundColor: "rgba(255, 255, 255, 0.08)",
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

  // Status Switcher
  segmentRow: { flexDirection: "row", gap: spacing.sm },
  statusSegment: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: spacing.sm + 2,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusSegmentReceived: {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderColor: colors.borderLight,
  },
  statusSegmentExpected: {
    backgroundColor: colors.warningMuted,
    borderColor: "rgba(245, 158, 11, 0.35)",
  },
  statusSegmentText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  statusSegmentTextReceived: {
    color: colors.textPrimary,
    fontWeight: "700",
  },
  statusSegmentTextExpected: {
    color: colors.warning,
    fontWeight: "700",
  },

  // Helper Tip Box
  helperTipBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    padding: spacing.sm + 2,
    marginTop: spacing.sm,
  },
  helperTipText: {
    flex: 1,
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 17,
  },

  // Methods Scroll
  methodsScroll: {
    flexDirection: "row",
    gap: spacing.xs + 2,
    paddingVertical: 2,
  },
  methodChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 3,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  methodChipActive: {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderColor: colors.borderLight,
  },
  methodText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  methodTextActive: {
    color: colors.textPrimary,
    fontWeight: "700",
  },

  error: { color: colors.danger, marginBottom: spacing.md, fontSize: 13 },
});
