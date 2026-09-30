import React, { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Keyboard
} from "react-native";
import { amountSchema, check, parseAmount } from "../../utils/validation";
import { StackActions } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import { useCategories } from "../../hooks/useCategories";
import { useTransactionMutations } from "../../hooks/useTransactions";
import { useDashboard } from "../../hooks/useDashboard";
import { useAppData } from "../../context/AppDataContext";
import { useDialog } from "../../context/DialogContext";
import { getErrorMessage } from "../../api/client";
import { TextField } from "../../components/TextField";
import { Button } from "../../components/Button";
import { DatePicker } from "../../components/DatePicker";
import { CategoryPill } from "../../components/CategoryPill";
import { BottomSheet } from "../../components/BottomSheet";
import { ChipGroup } from "../../components/ChipGroup";
import { FormFooter } from "../../components/FormFooter";
import { useSnackbar } from "../../components/snackbar/SnackbarContext";
import { useFocusAfterTransition } from "../../hooks/useFocusAfterTransition";
import { navigationRef } from "../../navigation/navigationRef";
import { budgetNoticeFor } from "../../utils/budgetNotice";
import { newTransactionId } from "../../lib/newId";
import { toMonthKey } from "../../utils/date";
import { colors } from "../../theme/colors";
import { radius, size, spacing } from "../../theme/spacing";
import { NeedWant, PaymentMethod } from "../../types/models";
import { formatAmountInput } from "../../utils/currency";
import { typography } from "../../theme/typography";
import { RootStackParamList } from "../../types/navigation";
import { hapticRecordCreated, hapticDelete, hapticError, hapticWarning } from "../../utils/haptics";

type Props = NativeStackScreenProps<RootStackParamList, "ExpenseForm">;

const PAYMENT_METHODS: PaymentMethod[] = ["Cash", "Bank Transfer", "Card", "Cheque"];
const NEED_WANT: NeedWant[] = ["Need", "Want"];

export function ExpenseFormScreen({ route, navigation }: Props) {
  const editing = route.params?.transaction;
  const { user } = useAuth();
  const { data: categories } = useCategories();

  const [date, setDate] = useState<Date>(editing ? new Date(editing.date) : new Date());
  // The month this expense lands in. Local, like the picker; the server derives the same key in
  // the user's timezone. (It used the UTC month, which is wrong for early-morning entries in PKT.)
  // For an edit whose date is unchanged, the server's month key is authoritative (it's in the
  // user's timezone, which can differ from the device's near a month boundary).
  const expenseMonth =
    editing && new Date(editing.date).getTime() === date.getTime() ? editing.month : toMonthKey(date);

  const { data: dashboardData } = useDashboard(expenseMonth);
  const { createTransaction, updateTransaction, deleteTransaction } = useTransactionMutations();
  const { setSelectedMonth } = useAppData();
  const { confirm } = useDialog();
  const snackbar = useSnackbar();

  const [categoryId, setCategoryId] = useState(editing?.categoryId ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [amount, setAmount] = useState(editing ? formatAmountInput(String(editing.amount)) : "");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    (editing?.paymentMethod as PaymentMethod) ?? "Cash"
  );
  const [needWant, setNeedWant] = useState<NeedWant>(editing?.needWant ?? "Need");
  const [error, setError] = useState<string | null>(null);
  const [amountError, setAmountError] = useState<string | null>(null);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const amountRef = useRef<TextInput>(null);
  // One id per form, reused on every Save tap. A save that timed out may still have succeeded, and
  // retrying with the same id returns that row instead of creating a second one.
  const clientIdRef = useRef(editing ? undefined : newTransactionId());
  useFocusAfterTransition(amountRef, !editing);

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

  const selectedCategory = (categories ?? []).find((c) => c.id === categoryId);
  const filteredCategories = (categories ?? [])
    .filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase().trim()))
    .sort((a, b) => {
      const aSpent = dashboardData?.budgetVsActual.find((x) => x.categoryId === a.id)?.actual ?? 0;
      const bSpent = dashboardData?.budgetVsActual.find((x) => x.categoryId === b.id)?.actual ?? 0;
      if (bSpent !== aSpent) return bSpent - aSpent;
      return a.name.localeCompare(b.name);
    });

  const handleSave = async () => {
    setError(null);
    const parsedAmount = parseAmount(amount);
    const amountProblem = check(amountSchema, parsedAmount);
    const amountInvalid = amountProblem !== null;
    setAmountError(amountProblem);
    setCategoryError(!categoryId ? "Choose a category" : null);
    if (amountInvalid) {
      amountRef.current?.focus();
      return;
    }
    if (!categoryId) {
      openSheet();
      return;
    }

    // Read before saving: the budget position this save starts from, in the expense's own month.
    const budgetItem = dashboardData?.budgetVsActual.find((b) => b.categoryId === categoryId);
    // An edit that stays in the same category and month has its old amount already counted.
    const alreadyCounted =
      editing && editing.categoryId === categoryId && editing.month === expenseMonth ? editing.amount : 0;
    const before = budgetItem?.actual ?? 0;
    const after = before - alreadyCounted + parsedAmount;

    try {
      setIsSaving(true);
      const input = {
        kind: "SPEND" as const,
        categoryId,
        date: date.toISOString(),
        description: description || undefined,
        amount: parsedAmount,
        paymentMethod,
        needWant,
      };

      // Save first, always (R-3). A budget warning never stands between the user and their entry.
      // Offline, the write is queued and this resolves at once; the client id means the new row
      // can still be highlighted, and a replay can't duplicate it.
      const title = description.trim() || selectedCategory?.name || "Expense";
      const clientId = clientIdRef.current;
      let savedId = editing?.id ?? clientId;
      if (editing) {
        await updateTransaction(editing.id, input, title);
      } else {
        const created = await createTransaction({ ...input, id: clientId }, title);
        savedId = created?.id ?? savedId;
      }
      hapticRecordCreated();

      // Then, if this save crossed a line in that month's budget, say so without blocking. No
      // cached budget for that month (e.g. offline) simply means no notice.
      const notice = budgetItem
        ? budgetNoticeFor({
            categoryName: budgetItem.name,
            month: expenseMonth,
            budget: budgetItem.budget,
            before,
            after,
          })
        : null;
      if (notice) {
        hapticWarning();
        snackbar.show({
          id: notice.id,
          text: notice.text,
          icon: "alert-outline",
          iconColor: notice.id === "S-2" ? colors.danger : colors.warning,
          action: {
            label: "Adjust budget",
            a11yLabel: `Adjust the ${budgetItem!.name} budget`,
            onPress: () => {
              if (navigationRef.isReady()) {
                // popTo, not navigate: React Navigation 7's navigate stacks a second Tabs over whatever
                // is open, and Back then walks through it.
                navigationRef.dispatch(
                  StackActions.popTo("Tabs", { screen: "Budget", params: { openCategoryId: categoryId } })
                );
              }
            },
          },
          duration: 6000,
          priority: 2,
        });
      }

      // Follow the saved entry to its month so it is actually visible.
      setSelectedMonth(expenseMonth);
      // A saved record, new or edited, opens its own Activity tab, highlighted (D-58, D-59).
      // popTo closes the form and returns to the Tabs underneath; navigate would stack new Tabs on it.
      navigation.popTo("Tabs", { screen: "Activity", params: { filter: "EXPENSES", highlightId: savedId } });
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
        await deleteTransaction(editing.id, editing.description || editing.category?.name || "this expense");
        navigation.goBack();
      },
    });
  }, [editing, confirm, deleteTransaction, navigation]);

  React.useLayoutEffect(() => {
    if (editing) {
      navigation.setOptions({
        headerRight: () => (
          <TouchableOpacity
            onPress={handleDelete}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Delete expense"
            style={styles.headerAction}
          >
            <MaterialCommunityIcons name="trash-can-outline" size={24} color={colors.danger} />
          </TouchableOpacity>
        ),
      });
    }
  }, [navigation, editing, handleDelete]);

  return (
    <>
      <KeyboardAvoidingView
        style={styles.container}
        // iOS only: on Android `padding` fights the window and double-lifts (ui-review 8.1); the
        // footer lifts itself there instead (FormFooter).
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          // "handled": a tap on empty space dismisses the keyboard; taps on fields and chips still land.
          keyboardShouldPersistTaps="handled"
          bounces={false}
          showsVerticalScrollIndicator={false}
        >
          <TextField
            ref={amountRef}
            label={`Amount (${user?.currency || "PKR"})`}
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={(val) => {
              setAmount(formatAmountInput(val));
              if (amountError) setAmountError(null);
            }}
            placeholder="0"
            error={amountError}
          />

          <TextField
            label="Description (optional)"
            value={description}
            onChangeText={setDescription}
            placeholder="e.g. Lunch at Kolachi"
            maxLength={40}
            numberOfLines={1}
          />

          {/* Category */}
          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Category</Text>
            <TouchableOpacity
              style={[styles.dropdownTrigger, categoryError ? styles.dropdownTriggerError : null]}
              onPress={openSheet}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={selectedCategory ? `Category, ${selectedCategory.name}` : "Choose a category"}
            >
              {selectedCategory ? (
                <View style={styles.dropdownSelectedRow}>
                  <CategoryPill icon={selectedCategory.icon} color={selectedCategory.color} size={28} />
                  <Text style={styles.dropdownText}>{selectedCategory.name}</Text>
                </View>
              ) : (
                <Text style={styles.dropdownPlaceholder}>Choose a category</Text>
              )}
              <MaterialCommunityIcons name="chevron-down" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            {categoryError ? <Text style={styles.fieldError}>{categoryError}</Text> : null}
          </View>

          {/* Date */}
          <DatePicker value={date} onChange={setDate} label="Date" maxDate={new Date()} />

          <ChipGroup label="Payment method" options={PAYMENT_METHODS} value={paymentMethod} onChange={setPaymentMethod} />
          <ChipGroup label="Need or want" options={NEED_WANT} value={needWant} onChange={setNeedWant} />
        </ScrollView>

        {/* Save stays reachable with the keyboard up (B1); a save error shows right above it. */}
        <FormFooter trackKeyboard={!isPickerOpen}>
          {error ? (
            <Text style={styles.error} accessibilityLiveRegion="polite">
              {error}
            </Text>
          ) : null}
          <Button label={editing ? "Save changes" : "Add expense"} onPress={handleSave} loading={isSaving} disabled={!hasChanges} />
        </FormFooter>
      </KeyboardAvoidingView>

      {/* Category Sheet */}
      <BottomSheet visible={isPickerOpen} onClose={closeSheet}>
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Category</Text>
          <TouchableOpacity onPress={closeSheet} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
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
              <TouchableOpacity
                onPress={() => setSearchQuery("")}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Clear search"
              >
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
                onPress={() => {
                  setCategoryId(c.id);
                  setCategoryError(null);
                  closeSheet();
                }}
                activeOpacity={0.7}
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected }}
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
            <View style={styles.noMatch}>
              <Text style={styles.noMatchText}>No matching categories</Text>
            </View>
          )}
        </ScrollView>
      </BottomSheet>

    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { padding: spacing.lg },
  headerAction: { marginRight: spacing.sm },
  label: { ...typography.caption, fontWeight: "600", color: colors.textSecondary, marginBottom: spacing.xs },
  fieldWrap: { marginBottom: spacing.md },
  error: { ...typography.small, fontWeight: "400", color: colors.danger, marginBottom: spacing.sm },
  fieldError: { ...typography.small, fontWeight: "500", color: colors.danger, marginTop: spacing.xs },

  dropdownTrigger: {
    minHeight: 56,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dropdownTriggerError: { borderColor: colors.danger },
  dropdownSelectedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
  },
  dropdownText: { ...typography.body, fontWeight: "600", color: colors.textPrimary },
  dropdownPlaceholder: { ...typography.body, fontWeight: "400", color: colors.textSecondary },

  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  sheetTitle: { ...typography.subtitle, fontWeight: "700", color: colors.textPrimary },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: size.minTouch,
    marginBottom: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    fontWeight: "400",
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  optionList: { maxHeight: 380 },
  noMatch: { paddingVertical: spacing.xl, alignItems: "center" },
  noMatchText: { ...typography.caption, fontWeight: "400", color: colors.textMuted },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    marginBottom: spacing.xs,
  },
  optionRowSelected: { backgroundColor: colors.borderLight },
  optionText: { flex: 1, ...typography.body, fontWeight: "500", color: colors.textSecondary },
  optionTextSelected: { color: colors.textPrimary, fontWeight: "700" },
});
