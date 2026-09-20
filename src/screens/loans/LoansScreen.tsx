import React, { useState, useMemo } from "react";
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
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { BottomSheet } from "../../components/BottomSheet";
import { TextField } from "../../components/TextField";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { formatCurrency, formatAmountInput } from "../../utils/currency";
import { hapticSuccess, hapticLight } from "../../utils/haptics";

type Props = NativeStackScreenProps<RootStackParamList, "Loans">;

export function LoansScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { loans, summary, isLoading, refresh, recordPayment, removeLoan } = useLoans();
  const { confirm, alert } = useDialog();

  const [typeFilter, setTypeFilter] = useState<"ALL" | LoanType>("ALL");
  const [showSettled, setShowSettled] = useState(false);

  // Settlement BottomSheet state
  const [settlingLoan, setSettlingLoan] = useState<Loan | null>(null);
  const [partialAmount, setPartialAmount] = useState("");
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  const filteredLoans = useMemo(() => {
    return loans.filter((loan) => {
      // Filter by type
      if (typeFilter !== "ALL" && loan.type !== typeFilter) {
        return false;
      }
      // Filter by active vs settled
      if (showSettled) {
        return loan.status === "SETTLED";
      }
      return loan.status !== "SETTLED";
    });
  }, [loans, typeFilter, showSettled]);

  const handleOpenSettle = (loan: Loan) => {
    hapticLight();
    setSettlingLoan(loan);
    setPartialAmount("");
  };

  const handleFullSettle = async () => {
    if (!settlingLoan) return;
    setIsSubmittingPayment(true);
    try {
      await recordPayment(settlingLoan.id);
      hapticSuccess();
      setSettlingLoan(null);
    } catch (err: any) {
      alert({ title: "Error", message: err.message || "Failed to settle loan" });
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const handlePartialSettle = async () => {
    if (!settlingLoan) return;
    const numeric = parseFloat(partialAmount.replace(/,/g, ""));
    if (isNaN(numeric) || numeric <= 0) {
      alert({ title: "Invalid Amount", message: "Please enter a valid payment amount." });
      return;
    }

    const remaining = Math.max(0, settlingLoan.amount - settlingLoan.settledAmount);
    if (numeric > remaining) {
      alert({
        title: "Amount Exceeds Balance",
        message: `The payment amount cannot exceed the remaining balance of ${formatCurrency(remaining)}.`,
      });
      return;
    }

    setIsSubmittingPayment(true);
    try {
      await recordPayment(settlingLoan.id, numeric);
      hapticSuccess();
      setSettlingLoan(null);
    } catch (err: any) {
      alert({ title: "Error", message: err.message || "Failed to record payment" });
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const handleDelete = (loan: Loan) => {
    confirm({
      title: "Delete Record?",
      message: `Are you sure you want to delete this loan record with ${loan.personName}?`,
      confirmText: "Delete",
      destructive: true,
      onConfirm: async () => {
        try {
          await removeLoan(loan.id);
          hapticSuccess();
        } catch (err: any) {
          alert({ title: "Error", message: err.message || "Failed to delete record" });
        }
      },
    });
  };

  return (
    <View style={styles.root}>
      {/* Top Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons name="chevron-left" size={28} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Lend & Borrow</Text>
        </View>

        <TouchableOpacity
          onPress={() => navigation.navigate("LoanForm")}
          style={styles.addBtn}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="plus" size={18} color="#FFFFFF" />
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredLoans}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refresh} tintColor={colors.accent} />}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Math.max(insets.bottom, 24) + spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* Top Summary Cards */}
            <View style={styles.summaryGrid}>
              <Card style={styles.summaryCard}>
                <View style={styles.summaryBadgeLent}>
                  <MaterialCommunityIcons name="arrow-top-right" size={14} color={colors.success} />
                  <Text style={styles.summaryBadgeTextLent}>YOU ARE OWED</Text>
                </View>
                <Text style={styles.summaryAmountLent}>
                  {formatCurrency(summary?.totalLentPending ?? 0)}
                </Text>
                <Text style={styles.summarySubtext}>
                  {summary?.activeLentCount ?? 0} active {summary?.activeLentCount === 1 ? "record" : "records"}
                </Text>
              </Card>

              <Card style={styles.summaryCard}>
                <View style={styles.summaryBadgeBorrowed}>
                  <MaterialCommunityIcons name="arrow-bottom-left" size={14} color={colors.warning} />
                  <Text style={styles.summaryBadgeTextBorrowed}>YOU OWE</Text>
                </View>
                <Text style={styles.summaryAmountBorrowed}>
                  {formatCurrency(summary?.totalBorrowedPending ?? 0)}
                </Text>
                <Text style={styles.summarySubtext}>
                  {summary?.activeBorrowedCount ?? 0} active {summary?.activeBorrowedCount === 1 ? "record" : "records"}
                </Text>
              </Card>
            </View>

            {/* Type Filter Pills */}
            <View style={styles.filterRow}>
              <View style={styles.typeFilterGroup}>
                {(["ALL", "LENT", "BORROWED"] as const).map((t) => {
                  const active = typeFilter === t;
                  const label = t === "ALL" ? "All" : t === "LENT" ? "Owed" : "I Owe";
                  return (
                    <TouchableOpacity
                      key={t}
                      style={[styles.filterPill, active && styles.filterPillActive]}
                      onPress={() => {
                        hapticLight();
                        setTypeFilter(t);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.filterPillText, active && styles.filterPillTextActive]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Status Toggle (Active vs Settled) */}
              <TouchableOpacity
                style={[styles.statusToggle, showSettled && styles.statusToggleActive]}
                onPress={() => {
                  hapticLight();
                  setShowSettled(!showSettled);
                }}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons
                  name={showSettled ? "check-circle" : "clock-outline"}
                  size={15}
                  color={showSettled ? colors.accent : colors.textMuted}
                />
                <Text style={[styles.statusToggleText, showSettled && styles.statusToggleTextActive]}>
                  {showSettled ? "Settled" : "Active"}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="handshake-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>
                {showSettled ? "No settled loan records" : "No active loan records"}
              </Text>
              <Text style={styles.emptySubtitle}>
                {showSettled
                  ? "Settled records will appear here once paid off."
                  : "Track money you lend to friends or borrow from institutions."}
              </Text>
              {!showSettled && (
                <Button
                  label="Add First Loan Record"
                  onPress={() => navigation.navigate("LoanForm")}
                  style={styles.emptyButton}
                />
              )}
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const isLent = item.type === "LENT";
          const remaining = Math.max(0, item.amount - item.settledAmount);
          const progress = Math.min(1, item.amount > 0 ? item.settledAmount / item.amount : 0);
          const isSettled = item.status === "SETTLED";

          // Due date check
          const isOverdue =
            !isSettled && item.dueDate && new Date(item.dueDate).getTime() < Date.now();

          return (
            <Card style={styles.loanCard}>
              <View style={styles.loanTopRow}>
                <View style={styles.loanLeft}>
                  <View
                    style={[
                      styles.avatarCircle,
                      { backgroundColor: isLent ? colors.successMuted : colors.warningMuted },
                    ]}
                  >
                    <Text
                      style={[
                        styles.avatarText,
                        { color: isLent ? colors.success : colors.warning },
                      ]}
                    >
                      {(item.personName || "L")[0].toUpperCase()}
                    </Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.personName}>{item.personName}</Text>
                    <View style={styles.badgeRow}>
                      <View
                        style={[
                          styles.typeBadge,
                          {
                            backgroundColor: isLent ? colors.successMuted : colors.warningMuted,
                            borderColor: isLent
                              ? "rgba(16, 185, 129, 0.3)"
                              : "rgba(245, 158, 11, 0.3)",
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.typeBadgeText,
                            { color: isLent ? colors.success : colors.warning },
                          ]}
                        >
                          {isLent ? "Owed to You" : "You Owe"}
                        </Text>
                      </View>

                      {isSettled ? (
                        <View style={styles.settledBadge}>
                          <Text style={styles.settledBadgeText}>Fully Settled</Text>
                        </View>
                      ) : isOverdue ? (
                        <View style={styles.overdueBadge}>
                          <MaterialCommunityIcons name="alert-circle-outline" size={12} color={colors.danger} />
                          <Text style={styles.overdueBadgeText}>Overdue</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </View>

                {/* Remaining Amount */}
                <View style={styles.loanRight}>
                  <Text
                    style={[
                      styles.loanAmount,
                      { color: isLent ? colors.success : colors.textPrimary },
                    ]}
                  >
                    {formatCurrency(remaining)}
                  </Text>
                  <Text style={styles.loanTotalLabel}>
                    of {formatCurrency(item.amount)}
                  </Text>
                </View>
              </View>

              {/* Progress bar toward complete settlement */}
              {item.amount > 0 && !isSettled && (
                <View style={styles.progressBarWrap}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${Math.round(progress * 100)}%`,
                        backgroundColor: isLent ? colors.success : colors.accent,
                      },
                    ]}
                  />
                </View>
              )}

              {/* Notes & Due Date info */}
              {(item.notes || item.dueDate) && (
                <View style={styles.detailsRow}>
                  {item.dueDate ? (
                    <View style={styles.detailItem}>
                      <MaterialCommunityIcons name="calendar-clock" size={13} color={colors.textMuted} />
                      <Text style={styles.detailText}>
                        Due {new Date(item.dueDate).toLocaleDateString()}
                      </Text>
                    </View>
                  ) : null}

                  {item.notes ? (
                    <Text style={styles.notesText} numberOfLines={1}>
                      {item.notes}
                    </Text>
                  ) : null}
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.cardActions}>
                {!isSettled && (
                  <TouchableOpacity
                    style={styles.settleBtn}
                    onPress={() => handleOpenSettle(item)}
                    activeOpacity={0.8}
                  >
                    <MaterialCommunityIcons name="cash-check" size={16} color="#FFFFFF" />
                    <Text style={styles.settleBtnText}>Record Payment</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDelete(item)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            </Card>
          );
        }}
      />

      {/* Settle / Payment BottomSheet */}
      <BottomSheet visible={Boolean(settlingLoan)} onClose={() => setSettlingLoan(null)}>
        {settlingLoan && (
          <View style={styles.sheetContent}>
            <Text style={styles.sheetTitle}>Record Payment</Text>
            <Text style={styles.sheetSubtitle}>
              {settlingLoan.type === "LENT"
                ? `Recording money received from ${settlingLoan.personName}`
                : `Recording money paid to ${settlingLoan.personName}`}
            </Text>

            <View style={styles.sheetBalanceCard}>
              <Text style={styles.sheetBalanceLabel}>Remaining Balance</Text>
              <Text style={styles.sheetBalanceValue}>
                {formatCurrency(Math.max(0, settlingLoan.amount - settlingLoan.settledAmount))}
              </Text>
            </View>

            {/* Settle In Full Action */}
            <Button
              label="Settle Remaining in Full"
              onPress={handleFullSettle}
              loading={isSubmittingPayment}
              style={{ width: "100%" }}
            />

            <View style={styles.sheetDividerRow}>
              <View style={styles.sheetDivider} />
              <Text style={styles.sheetDividerText}>OR PARTIAL PAYMENT</Text>
              <View style={styles.sheetDivider} />
            </View>

            {/* Custom Partial Amount */}
            <TextField
              label="Partial Amount Paid"
              value={partialAmount}
              onChangeText={(text) => setPartialAmount(formatAmountInput(text))}
              placeholder="0"
              keyboardType="numeric"
            />

            <Button
              label="Record Partial Amount"
              variant="secondary"
              onPress={handlePartialSettle}
              loading={isSubmittingPayment}
              disabled={!partialAmount.trim()}
              style={{ width: "100%" }}
            />
          </View>
        )}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    backgroundColor: colors.background,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  backBtn: {
    padding: spacing.xs,
    marginLeft: -spacing.xs,
  },
  title: {
    ...typography.title,
    fontSize: 22,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
  },
  addBtnText: {
    ...typography.small,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  summaryGrid: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  summaryCard: {
    flex: 1,
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  summaryBadgeLent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 6,
  },
  summaryBadgeTextLent: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: "700",
    color: colors.success,
    letterSpacing: 0.5,
  },
  summaryAmountLent: {
    ...typography.metricValue,
    fontSize: 20,
    color: colors.success,
  },
  summaryBadgeBorrowed: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 6,
  },
  summaryBadgeTextBorrowed: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: "700",
    color: colors.warning,
    letterSpacing: 0.5,
  },
  summaryAmountBorrowed: {
    ...typography.metricValue,
    fontSize: 20,
    color: colors.warning,
  },
  summarySubtext: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: spacing.xs,
  },
  typeFilterGroup: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  filterPillActive: {
    backgroundColor: colors.surfaceRaised,
  },
  filterPillText: {
    ...typography.caption,
    fontSize: 13,
    fontWeight: "600",
    color: colors.textMuted,
  },
  filterPillTextActive: {
    color: colors.textPrimary,
    fontWeight: "700",
  },
  statusToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusToggleActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentMuted,
  },
  statusToggleText: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: "600",
    color: colors.textMuted,
  },
  statusToggleTextActive: {
    color: colors.accent,
    fontWeight: "700",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xxl,
    gap: spacing.xs,
  },
  emptyTitle: {
    ...typography.subtitle,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  emptySubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: "center",
    maxWidth: 260,
  },
  emptyButton: {
    marginTop: spacing.md,
  },
  loanCard: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
  loanTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  loanLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    flex: 1,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "800",
  },
  personName: {
    ...typography.body,
    fontWeight: "700",
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: 3,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  settledBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  settledBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textMuted,
  },
  overdueBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.dangerMuted,
  },
  overdueBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.danger,
  },
  loanRight: {
    alignItems: "flex-end",
  },
  loanAmount: {
    ...typography.subtitle,
    fontWeight: "800",
  },
  loanTotalLabel: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  progressBarWrap: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    overflow: "hidden",
    marginTop: 2,
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 2,
  },
  detailsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginTop: 2,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  detailText: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textMuted,
  },
  notesText: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textSecondary,
    flex: 1,
  },
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  settleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 3,
    borderRadius: radius.md,
  },
  settleBtnText: {
    ...typography.small,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  deleteBtn: {
    padding: spacing.xs,
  },
  sheetContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  sheetTitle: {
    ...typography.title,
    fontSize: 20,
  },
  sheetSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: -spacing.xs,
  },
  sheetBalanceCard: {
    padding: spacing.md,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    alignItems: "center",
    gap: 4,
    marginVertical: spacing.xs,
  },
  sheetBalanceLabel: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: "uppercase",
    fontSize: 11,
    fontWeight: "700",
  },
  sheetBalanceValue: {
    ...typography.metricValue,
    fontSize: 26,
    color: colors.textPrimary,
  },
  sheetDividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginVertical: spacing.xs,
  },
  sheetDivider: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  sheetDividerText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: "700",
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
});
