import React, { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  TextInput,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useJoined } from "../../hooks/useJoined";
import { amountSchema, check, parseAmount, personNameSchema } from "../../utils/validation";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { RootStackParamList } from "../../types/navigation";
import { useAuth } from "../../context/AuthContext";
import { useLoans } from "../../hooks/useLoans";
import { Loan, LoanType, loanDate } from "../../types/models";
import { useAppData } from "../../context/AppDataContext";
import { toMonthKey } from "../../utils/date";
import { TextField } from "../../components/TextField";
import { ChipGroup } from "../../components/ChipGroup";
import { Button } from "../../components/Button";
import { DatePicker } from "../../components/DatePicker";
import { FormFooter } from "../../components/FormFooter";
import { useFocusAfterTransition } from "../../hooks/useFocusAfterTransition";
import { colors } from "../../theme/colors";
import { radius, size, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { formatAmountInput, formatCurrency } from "../../utils/currency";
import { formatDayMonth } from "../../utils/date";
import { getErrorMessage } from "../../api/client";
import { hapticRecordCreated, hapticError, hapticLight, feedbackUpdated } from "../../utils/haptics";

/** The checkbox icons' size; the hint under one lines up with its label. */
const CHECKBOX_SIZE = 22;

/**
 * Did the money go through the user's cash? The one question that decides what a loan does to the
 * balance (Bilal, 2026-10-02), so it's asked first and never pre-answered on a new loan.
 */
type CashChoice = "NOW" | "BEFORE";
const CASH_CHOICES: readonly CashChoice[] = ["NOW", "BEFORE"];

type Props = NativeStackScreenProps<RootStackParamList, "LoanForm">;

/** What the cash choice does, in words: "Your cash goes down by Rs 2,000 on 20 Sep." */
function cashEffect(type: LoanType, choice: CashChoice, amount: number, date: Date): string {
  const sum = amount > 0 ? formatCurrency(amount) : "this amount";
  if (choice === "BEFORE") {
    return type === "LENT"
      ? "It left your cash before you started Expenso, so your cash doesn't change now. It goes up when you're paid back."
      : "You spent it before you started Expenso, so your cash doesn't change now. It goes down when you pay it back.";
  }
  return `Your cash goes ${type === "LENT" ? "down" : "up"} by ${sum} on ${formatDayMonth(date.toISOString())}.`;
}

export function LoanFormScreen({ route, navigation }: Props) {
  // History starts at the join date: the pickers stop there (D-67).
  const joined = useJoined();
  const { user } = useAuth();
  const { addLoan, editLoan } = useLoans();
  const editing = route.params?.loan;

  const [type, setType] = useState<LoanType>(editing?.type || route.params?.initialType || "LENT");
  const [personName, setPersonName] = useState(editing?.personName ?? "");
  const [rawAmount, setRawAmount] = useState(editing ? formatAmountInput(String(editing.amount)) : "");
  const [hasDueDate, setHasDueDate] = useState(Boolean(editing?.dueDate));
  const [dueDate, setDueDate] = useState<Date>(
    editing?.dueDate ? new Date(editing.dueDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  // When the money moved (R-41): today by default; never in the future (D-63).
  const originalDate = React.useMemo(() => (editing ? new Date(loanDate(editing)) : null), [editing]);
  // A new loan defaults to today at noon, as the date picker saves any day (D-63).
  const [date, setDate] = useState<Date>(() => {
    if (originalDate) return originalDate;
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    return today;
  });
  const { selectedMonth, setSelectedMonth } = useAppData();
  /**
   * Whether the money went through the user's cash. No default on a new loan: a wrong guess is what
   * made a loan's repayment inflate the balance. On edit it starts from the saved choice and can be
   * changed (undefined from an older server: left alone).
   */
  const savedChoice: CashChoice | null =
    editing?.cashMoved === undefined ? null : editing.cashMoved ? "NOW" : "BEFORE";
  const [cashChoice, setCashChoice] = useState<CashChoice | null>(savedChoice);
  const [error, setError] = useState<string | null>(null);
  const [amountError, setAmountError] = useState<string | null>(null);
  const [personError, setPersonError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // On edit, Save waits for a change, like the expense and income forms.
  const hasChanges = React.useMemo(() => {
    if (!editing) return true;
    if (personName.trim() !== editing.personName) return true;
    const amountNow = Number(rawAmount.replace(/,/g, ""));
    if (!isNaN(amountNow) && amountNow !== editing.amount) return true;
    if (hasDueDate !== Boolean(editing.dueDate)) return true;
    if (hasDueDate && editing.dueDate && dueDate.toDateString() !== new Date(editing.dueDate).toDateString()) return true;
    if (originalDate && date.toDateString() !== originalDate.toDateString()) return true;
    if (cashChoice !== savedChoice) return true;
    return false;
  }, [editing, personName, rawAmount, hasDueDate, dueDate, date, originalDate, cashChoice, savedChoice]);

  const amountRef = useRef<TextInput>(null);
  const personRef = useRef<TextInput>(null);
  useFocusAfterTransition(amountRef, !editing);

  const currencySymbol = user?.currency || "PKR";

  // The header names the task, and follows the direction toggle on create (P11). RootNavigator sets
  // the same title from the route params, so the first frame is already right.
  React.useLayoutEffect(() => {
    navigation.setOptions({ title: editing ? "Edit loan" : type === "LENT" ? "Lend money" : "Borrow money" });
  }, [navigation, editing, type]);

  const handleAmountChange = (text: string) => {
    setRawAmount(formatAmountInput(text));
    if (amountError) setAmountError(null);
  };

  const handleSave = async () => {
    setError(null);

    // Fields top to bottom, so focus lands on the first one that needs attention.
    const cleanName = personName.trim();
    const numericAmount = parseAmount(rawAmount);
    const amountProblem = check(amountSchema, numericAmount);
    const personProblem = check(personNameSchema, personName);
    const amountInvalid = amountProblem !== null;
    setAmountError(amountProblem);
    setPersonError(personProblem);
    if (!cashChoice) {
      hapticError();
      setError(type === "LENT" ? "Say whether this came out of your cash" : "Say whether this came into your cash");
      return;
    }
    if (amountInvalid || personProblem) {
      hapticError();
      (amountInvalid ? amountRef : personRef).current?.focus();
      return;
    }

    setIsSubmitting(true);
    // Online, the new loan comes back with its id; offline it's queued and there's nothing to
    // highlight yet, but the Loans tab still opens.
    let created: Loan | undefined;
    try {
      if (editing) {
        // The date is sent only when it changed. An older loan can have a repayment dated before
        // its backfilled date, and re-sending that date unchanged would be refused.
        const dateChanged = originalDate === null || originalDate.toDateString() !== date.toDateString();
        await editLoan(editing.id, {
          personName: cleanName,
          amount: numericAmount,
          dueDate: hasDueDate ? dueDate.toISOString() : null,
          ...(dateChanged ? { date: date.toISOString() } : {}),
          ...(cashChoice && cashChoice !== savedChoice ? { recordCashflow: cashChoice === "NOW" } : {}),
        });
      } else {
        created = await addLoan({
          type,
          personName: cleanName,
          amount: numericAmount,
          dueDate: hasDueDate ? dueDate.toISOString() : undefined,
          recordCashflow: cashChoice === "NOW",
          date: date.toISOString(),
        });
      }

      if (editing) feedbackUpdated();
      else hapticRecordCreated();
      // A loan shows from its own month onward, so only a later month than the one showing needs a
      // switch; otherwise the whole app would jump months after a small edit.
      if (toMonthKey(date) > selectedMonth) setSelectedMonth(toMonthKey(date));
      // A saved loan, new or edited, opens the Loans tab, highlighted (D-58, D-59).
      // popTo closes the form and returns to the Tabs underneath; navigate would stack new Tabs on it.
      navigation.popTo("Tabs", {
        screen: "Activity",
        params: { filter: "LOANS", highlightId: editing?.id ?? created?.id },
      });
    } catch (err) {
      hapticError();
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      // iOS only: on Android `padding` fights the window and double-lifts (ui-review 8.1); the
      // footer lifts itself there instead (FormFooter).
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        overScrollMode="never"
        style={styles.scroll}
        contentContainerStyle={styles.content}
        // "handled": a tap on empty space dismisses the keyboard; taps on fields still land.
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* The native header carries the title (P11); this line explains the direction. */}
        <Text style={styles.subtitle}>
          {type === "LENT" ? "You gave money to someone and expect it back" : "You borrowed money and need to repay it"}
        </Text>

        {/* Type Selector (Lent vs Borrowed) — create only. Flipping direction after the
            opening movement is recorded would leave the ledger describing something that
            never happened. */}
        {!editing && (
          <View style={styles.typeSelector} accessibilityRole="radiogroup" accessibilityLabel="Loan type">
            {/* One selection style app-wide (W6); the direction's colour stays in the icon (W4). */}
            <TouchableOpacity
              style={[styles.typeTab, type === "LENT" && styles.typeTabActive]}
              onPress={() => {
                hapticLight();
                setType("LENT");
              }}
              activeOpacity={0.8}
              accessibilityRole="radio"
              accessibilityState={{ checked: type === "LENT" }}
            >
              <MaterialCommunityIcons
                name="arrow-top-right"
                size={18}
                color={type === "LENT" ? colors.lent : colors.textMuted}
              />
              <Text style={[styles.typeTabText, type === "LENT" && styles.typeTabTextActive]}>I lent</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.typeTab, type === "BORROWED" && styles.typeTabActive]}
              onPress={() => {
                hapticLight();
                setType("BORROWED");
              }}
              activeOpacity={0.8}
              accessibilityRole="radio"
              accessibilityState={{ checked: type === "BORROWED" }}
            >
              <MaterialCommunityIcons
                name="arrow-bottom-left"
                size={18}
                color={type === "BORROWED" ? colors.borrowed : colors.textMuted}
              />
              <Text style={[styles.typeTabText, type === "BORROWED" && styles.typeTabTextActive]}>I borrowed</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* The question that decides what this does to the balance, asked before anything else
            and never pre-answered (Bilal, 2026-10-02). */}
        <View>
          <ChipGroup
            label={type === "LENT" ? "Where did this money come from?" : "Where did this money go?"}
            options={CASH_CHOICES}
            value={cashChoice ?? undefined}
            onChange={(choice) => {
              setCashChoice(choice);
              if (error) setError(null);
            }}
            optionLabel={(choice) =>
              choice === "NOW"
                ? type === "LENT"
                  ? "From my cash"
                  : "Into my cash"
                : "Before Expenso"
            }
          />
          {cashChoice ? <Text style={styles.choiceHint}>{cashEffect(type, cashChoice, parseAmount(rawAmount), date)}</Text> : null}
        </View>

        {/* Amount first, like the other forms (D-33). */}
        <TextField
          ref={amountRef}
          label={`Amount (${currencySymbol})`}
          value={rawAmount}
          onChangeText={handleAmountChange}
          placeholder="0"
          keyboardType="decimal-pad"
          error={amountError}
        />

        <TextField
          ref={personRef}
          label="Person"
          value={personName}
          onChangeText={(text) => {
            setPersonName(text);
            if (personError) setPersonError(null);
          }}
          placeholder={type === "LENT" ? "Who you lent to" : "Who you borrowed from, or a bank"}
          autoCapitalize="words"
          error={personError}
        />

        {/* When the money moved (R-41). Future days can't be picked (D-63). */}
        <DatePicker label="Date" value={date} onChange={setDate} maxDate={new Date()} minDate={joined.date} />

        {/* Due Date Toggle & Picker */}
        <View style={styles.dueSection}>
          <TouchableOpacity
            style={styles.dueToggleRow}
            onPress={() => setHasDueDate(!hasDueDate)}
            activeOpacity={0.7}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: hasDueDate }}
          >
            <MaterialCommunityIcons
              name={hasDueDate ? "checkbox-marked" : "checkbox-blank-outline"}
              size={CHECKBOX_SIZE}
              color={hasDueDate ? colors.accent : colors.textMuted}
            />
            <Text style={styles.dueToggleLabel}>Set a repayment due date</Text>
          </TouchableOpacity>

          {hasDueDate && (
            <View style={styles.datePickerWrap}>
              <DatePicker label="Due date" value={dueDate} onChange={setDueDate} />
            </View>
          )}
        </View>
      </ScrollView>

      {/* Save stays reachable with the keyboard up (B1); a save error shows right above it. */}
      <FormFooter>
        {error ? (
          <Text style={styles.errorText} accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}
        <Button
          label={editing ? "Save changes" : "Save loan"}
          onPress={handleSave}
          loading={isSubmitting}
          disabled={!hasChanges || !cashChoice}
        />
      </FormFooter>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md },
  subtitle: { ...typography.caption, color: colors.textSecondary },
  typeSelector: {
    flexDirection: "row",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    padding: spacing.xs,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    minHeight: size.minTouch,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    // Always 1pt, so selecting a side doesn't shift its content.
    borderWidth: 1,
    borderColor: "transparent",
  },
  typeTabActive: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.accent,
  },
  typeTabText: {
    ...typography.small,
    color: colors.textMuted,
    fontWeight: "600",
  },
  typeTabTextActive: {
    color: colors.textPrimary,
    fontWeight: "700",
  },
  dueSection: {
    gap: spacing.xs,
  },
  dueToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: size.minTouch,
    paddingVertical: spacing.xs,
  },
  choiceHint: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: -spacing.xs,
  },
  dueToggleLabel: {
    ...typography.small,
    // Wraps beside the checkbox instead of running past the screen edge.
    flexShrink: 1,
    fontWeight: "500",
    color: colors.textSecondary,
  },
  datePickerWrap: {
    marginTop: spacing.xs,
  },
  errorText: {
    // After the spread, which carries its own colour: errors are red, as on the other forms.
    ...typography.caption,
    color: colors.danger,
    marginBottom: spacing.sm,
  },
});
