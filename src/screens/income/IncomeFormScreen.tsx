import React, { useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  PanResponder,
  Animated,
  Dimensions
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useIncome } from "../../hooks/useIncome";
import { useDialog } from "../../context/DialogContext";
import { getErrorMessage } from "../../api/client";
import { TextField } from "../../components/TextField";
import { Button } from "../../components/Button";
import { DatePicker } from "../../components/DatePicker";
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
const PAYMENT_METHODS: PaymentMethod[] = ["Cash", "Bank Transfer", "Card", "Cheque"];

export function IncomeFormScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const editing = route.params?.income;
  const { addIncome, editIncome, removeIncome } = useIncome();
  const { confirm } = useDialog();

  const [selectedPreset, setSelectedPreset] = useState<SourcePreset>(
    PRESET_SOURCES.find((p) => p.source === editing?.source) ?? PRESET_SOURCES[0]
  );
  const [amount, setAmount] = useState(editing ? String(editing.amount) : "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [status, setStatus] = useState<IncomeStatus>(editing?.status ?? "Received");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    (editing?.paymentMethod as PaymentMethod) ?? "Bank Transfer"
  );
  const [date, setDate] = useState<Date>(editing ? new Date(editing.date) : new Date());
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isSheetExpanded, setIsSheetExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const SCREEN_HEIGHT = Dimensions.get("window").height;
  const sheetHeight = SCREEN_HEIGHT * 0.92;
  const peekHeight = 360;
  const defaultOffset = sheetHeight - peekHeight;
  const panY = React.useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const sheetOffset = React.useRef(defaultOffset);

  React.useEffect(() => {
    if (isPickerOpen) {
      setIsSheetExpanded(false);
      sheetOffset.current = defaultOffset;
      panY.setValue(SCREEN_HEIGHT);
      Animated.spring(panY, {
        toValue: defaultOffset,
        useNativeDriver: true,
        tension: 250,
        friction: 25,
      }).start();
    }
  }, [isPickerOpen]);

  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (e, gestureState) => {
        let newY = sheetOffset.current + gestureState.dy;
        if (newY < 0) newY = 0;
        panY.setValue(newY);
      },
      onPanResponderRelease: (e, gestureState) => {
        const currentY = sheetOffset.current + gestureState.dy;
        const velocityY = gestureState.vy;

        let snapTo = defaultOffset;
        let nextExpanded = false;

        if (velocityY < -1 || currentY < defaultOffset / 2) {
          snapTo = 0;
          nextExpanded = true;
        } else if (velocityY > 1.5 || currentY > defaultOffset + 100) {
          setIsPickerOpen(false);
          return;
        } else {
          snapTo = defaultOffset;
          nextExpanded = false;
        }

        sheetOffset.current = snapTo;
        setIsSheetExpanded(nextExpanded);
        Animated.spring(panY, {
          toValue: snapTo,
          useNativeDriver: true,
          tension: 250,
          friction: 25,
        }).start();
      }
    })
  ).current;

  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
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
        status,
        paymentMethod,
      };

      if (editing) {
        await editIncome(editing.id, input);
      } else {
        await addIncome(input);
      }

      // showToast({
      //   message: editing ? "Income updated" : "Income logged",
      //   type: "success",
      // });
      navigation.goBack();
    } catch (err) {
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
        await removeIncome(editing.id);
        // showToast({ message: "Income deleted", type: "success" });
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
          onChangeText={setAmount}
          placeholder="Amount (PKR)"
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
            onPress={() => { setSearchQuery(""); setIsSheetExpanded(false); setIsPickerOpen(true); }}
            activeOpacity={0.7}
            accessibilityLabel="Select Income Source"
          >
            <CategoryPill icon={selectedPreset.icon} size={28} />
            <Text style={styles.dropdownText}>{selectedPreset.source}</Text>
            <MaterialCommunityIcons name="chevron-down" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Date */}
        <DatePicker value={date} onChange={setDate} label="Date" />

        {/* Status */}
        <View style={styles.fieldWrap}>
          <Text style={styles.label}>Status</Text>
          <View style={styles.segmentRow}>
            {STATUS_OPTIONS.map((opt) => {
              const isActive = status === opt;
              return (
                <TouchableOpacity
                  key={opt}
                  style={[styles.segment, isActive && styles.segmentActive]}
                  onPress={() => setStatus(opt)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.segmentText, isActive && styles.segmentTextActive]}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

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
          style={{ marginTop: spacing.sm }}
        />
      </ScrollView>

      {/* Source Selection Sheet */}
      <Modal visible={isPickerOpen} transparent animationType="fade" onRequestClose={() => setIsPickerOpen(false)}>
        <TouchableOpacity style={styles.sheetBackdrop} activeOpacity={1} onPress={() => setIsPickerOpen(false)}>
          <Animated.View
            style={[
              styles.sheetContent,
              {
                paddingBottom: Math.max(insets.bottom, 16) + spacing.md,
                height: sheetHeight,
                transform: [{ translateY: panY }]
              }
            ]}
          >
            <View {...panResponder.panHandlers} style={{ backgroundColor: 'transparent', paddingVertical: spacing.sm }}>
              <View style={styles.sheetDragHandle} />
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Income Source</Text>
                <TouchableOpacity onPress={() => setIsPickerOpen(false)} hitSlop={12}>
                  <MaterialCommunityIcons name="close" size={22} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView style={styles.optionList} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {PRESET_SOURCES.map((p) => {
                const isSelected = p.source === selectedPreset.source;
                return (
                  <TouchableOpacity
                    key={p.source}
                    style={[styles.optionRow, isSelected && styles.optionRowSelected]}
                    onPress={() => { setSelectedPreset(p); setIsPickerOpen(false); }}
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
          </Animated.View>
        </TouchableOpacity>
      </Modal>
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

  sheetBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  sheetContent: {
    backgroundColor: colors.surfaceRaised,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
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
