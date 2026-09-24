import React, { useMemo, useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RootStackParamList } from "../../types/navigation";
import { useLoans } from "../../hooks/useLoans";
import { useDialog } from "../../context/DialogContext";
import { Loan, LoanType } from "../../types/models";
import { LoanSettleSheet } from "../../components/LoanSettleSheet";
import { AnimatedSegmentedControl, SegmentOption } from "../../components/AnimatedSegmentedControl";
import { EmptyState } from "../../components/EmptyState";
import { getErrorMessage } from "../../api/client";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { formatCurrency } from "../../utils/currency";
import { formatDate } from "../../utils/date";
import { hapticLight } from "../../utils/haptics";

type Props = NativeStackScreenProps<RootStackParamList, "Loans">;

type Scope = "ACTIVE" | "SETTLED";
type TypeFilter = "ALL" | LoanType;

const SCOPES: SegmentOption<Scope>[] = [
  { label: "Active", value: "ACTIVE" },
  { label: "Settled", value: "SETTLED" },
];

const TYPES: { label: string; value: TypeFilter }[] = [
  { label: "All", value: "ALL" },
  { label: "Owed to me", value: "LENT" },
  { label: "I owe", value: "BORROWED" },
];

/**
 * Full debt management, reached from Home's "Debts & Loans" card.
 *
 * This screen existed at 821 lines and was imported by nothing, so loans could only be settled
 * from a sheet in the Activity feed and could not be edited at all. It now reuses
 * `LoanSettleSheet` rather than carrying a second inline copy of the same settlement UI.
 */
export function LoansScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { loans, summary, isLoading, refresh, recordPayment, removeLoan } = useLoans();
  const { confirm, alert } = useDialog();

  const [scope, setScope] = useState<Scope>("ACTIVE");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
  const [settlingLoan, setSettlingLoan] = useState<Loan | null>(null);

  const visibleLoans = useMemo(
    () =>
      loans.filter((loan) => {
        if (typeFilter !== "ALL" && loan.type !== typeFilter) return false;
        return scope === "SETTLED" ? loan.status === "SETTLED" : loan.status !== "SETTLED";
      }),
    [loans, typeFilter, scope]
  );

  const confirmDelete = (loan: Loan) => {
    confirm({
      title: "Delete this record?",
      message: `${loan.type === "LENT" ? "Lent to" : "Borrowed from"} ${loan.personName} · ${formatCurrency(loan.amount)}. Any payments recorded against it are removed too.`,
      confirmText: "Delete",
      destructive: true,
      onConfirm: async () => {
        try {
          await removeLoan(loan.id);
        } catch (err) {
          alert({ title: "Couldn't delete", message: getErrorMessage(err) });
        }
      },
    });
  };

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.iconButton}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <MaterialCommunityIcons name="chevron-left" size={28} color={colors.textPrimary} />
        </TouchableOpacity>

        <Text style={styles.title}>Debts & Loans</Text>

        <TouchableOpacity
          onPress={() => navigation.navigate("LoanForm")}
          style={styles.iconButton}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Record a new loan"
        >
          <MaterialCommunityIcons name="plus" size={24} color={colors.accent} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={visibleLoans}
        keyExtractor={(loan) => loan.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refresh} tintColor={colors.accent} />
        }
        ListHeaderComponent={
          <>
            {summary && (
              <View style={styles.summaryCard}>
                <View style={styles.summaryCol}>
                  <Text style={styles.summaryLabel}>OWED TO YOU</Text>
                  <Text style={[styles.summaryValue, { color: colors.success }]}>
                    {formatCurrency(summary.totalLentPending)}
                  </Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryCol}>
                  <Text style={styles.summaryLabel}>YOU OWE</Text>
                  <Text style={[styles.summaryValue, { color: colors.danger }]}>
                    {formatCurrency(summary.totalBorrowedPending)}
                  </Text>
                </View>
              </View>
            )}

            <AnimatedSegmentedControl options={SCOPES} selected={scope} onChange={setScope} />

            <View style={styles.typeRow}>
              {TYPES.map((t) => {
                const active = typeFilter === t.value;
                return (
                  <TouchableOpacity
                    key={t.value}
                    style={[styles.typeChip, active && styles.typeChipActive]}
                    onPress={() => {
                      hapticLight();
                      setTypeFilter(t.value);
                    }}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        }
        ListEmptyComponent={
          <EmptyState
            icon="hand-coin-outline"
            title={scope === "SETTLED" ? "Nothing settled yet" : "No open debts"}
            subtitle={
              scope === "SETTLED"
                ? "Loans you've fully settled will be kept here."
                : "Money you lend or borrow will appear here."
            }
          />
        }
        renderItem={({ item }) => (
          <LoanRow
            loan={item}
            onSettle={() => setSettlingLoan(item)}
            onEdit={() => navigation.navigate("LoanForm", { loan: item })}
            onDelete={() => confirmDelete(item)}
          />
        )}
      />

      <LoanSettleSheet
        loan={settlingLoan}
        onClose={() => setSettlingLoan(null)}
        onSettle={async (loanId, amount) => {
          await recordPayment(loanId, amount);
        }}
        onDelete={(loanId) => {
          const loan = loans.find((l) => l.id === loanId);
          if (loan) confirmDelete(loan);
        }}
      />
    </View>
  );
}

function LoanRow({
  loan,
  onSettle,
  onEdit,
  onDelete,
}: {
  loan: Loan;
  onSettle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isLent = loan.type === "LENT";
  const remaining = Math.max(0, loan.amount - loan.settledAmount);
  const progress = loan.amount > 0 ? loan.settledAmount / loan.amount : 0;
  const isSettled = loan.status === "SETTLED";
  const isOverdue =
    !isSettled && !!loan.dueDate && new Date(loan.dueDate).getTime() < Date.now();

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.cardMain}
        onPress={onSettle}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={`${isLent ? "Lent to" : "Borrowed from"} ${loan.personName}, ${formatCurrency(remaining)} remaining`}
      >
        <View
          style={[
            styles.avatar,
            { backgroundColor: isLent ? "rgba(96,165,250,0.14)" : "rgba(245,158,11,0.14)" },
          ]}
        >
          <MaterialCommunityIcons
            name={isLent ? "arrow-top-right" : "arrow-bottom-left"}
            size={20}
            color={isLent ? "#60A5FA" : colors.warning}
          />
        </View>

        <View style={styles.cardBody}>
          {/* The counterparty is the whole point of a loan record — without it every row reads
              identically. Previously rows showed only "Lent" or "Borrowed". */}
          <Text style={styles.personName} numberOfLines={1}>
            {loan.personName}
          </Text>
          <Text style={styles.cardMeta} numberOfLines={1}>
            {isLent ? "Owed to you" : "You owe"}
            {loan.dueDate ? ` · due ${formatDate(loan.dueDate)}` : ""}
          </Text>
        </View>

        <View style={styles.cardAmounts}>
          <Text style={[styles.remaining, isSettled && styles.remainingSettled]}>
            {formatCurrency(isSettled ? loan.amount : remaining)}
          </Text>
          {!isSettled && loan.settledAmount > 0 && (
            <Text style={styles.ofTotal}>of {formatCurrency(loan.amount)}</Text>
          )}
          {isOverdue && <Text style={styles.overdue}>Overdue</Text>}
        </View>
      </TouchableOpacity>

      {!isSettled && loan.settledAmount > 0 && (
        <View style={styles.track}>
          <View style={[styles.trackFill, { width: `${Math.min(100, progress * 100)}%` }]} />
        </View>
      )}

      <View style={styles.cardActions}>
        <TouchableOpacity onPress={onEdit} style={styles.action} hitSlop={8}>
          <MaterialCommunityIcons name="pencil-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.actionText}>Edit</Text>
        </TouchableOpacity>
        {!isSettled && (
          <TouchableOpacity onPress={onSettle} style={styles.action} hitSlop={8}>
            <MaterialCommunityIcons name="cash-check" size={16} color={colors.accent} />
            <Text style={[styles.actionText, { color: colors.accent }]}>Settle</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={onDelete} style={styles.action} hitSlop={8}>
          <MaterialCommunityIcons name="trash-can-outline" size={16} color={colors.danger} />
          <Text style={[styles.actionText, { color: colors.danger }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { ...typography.title, fontSize: 20, color: colors.textPrimary },

  listContent: { paddingHorizontal: spacing.lg, gap: spacing.sm },

  summaryCard: {
    flexDirection: "row",
    backgroundColor: colors.surfaceRaised,
    borderRadius: 22,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.md,
  },
  summaryCol: { flex: 1, alignItems: "center" },
  summaryDivider: { width: 1, backgroundColor: colors.borderLight },
  summaryLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textMuted,
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  summaryValue: { fontSize: 17, fontWeight: "700" },

  typeRow: { flexDirection: "row", gap: spacing.xs, marginTop: spacing.sm, marginBottom: spacing.md },
  typeChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeChipActive: { backgroundColor: colors.accentMuted, borderColor: colors.accent },
  typeChipText: { fontSize: 13, fontWeight: "600", color: colors.textSecondary },
  typeChipTextActive: { color: colors.accent, fontWeight: "700" },

  card: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cardMain: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: { flex: 1 },
  personName: { fontSize: 16, fontWeight: "700", color: colors.textPrimary, letterSpacing: -0.2 },
  cardMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  cardAmounts: { alignItems: "flex-end" },
  remaining: { fontSize: 16, fontWeight: "700", color: colors.textPrimary },
  remainingSettled: { color: colors.textMuted, textDecorationLine: "line-through" },
  ofTotal: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  overdue: { fontSize: 11, fontWeight: "700", color: colors.danger, marginTop: 2 },

  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.06)",
    overflow: "hidden",
    marginTop: spacing.sm,
  },
  trackFill: { height: "100%", backgroundColor: colors.accent, borderRadius: 2 },

  cardActions: {
    flexDirection: "row",
    gap: spacing.lg,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  action: { flexDirection: "row", alignItems: "center", gap: 5, minHeight: 32 },
  actionText: { fontSize: 13, fontWeight: "600", color: colors.textSecondary },
});
