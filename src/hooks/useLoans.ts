import { useMutation, useQuery } from "@tanstack/react-query";
import * as loansApi from "../api/loans";
import { Loan, LoanInput, LoanStatus, LoanType } from "../types/models";
import { queryKeys } from "../lib/queryClient";
import {
  CreateLoanVars,
  DeleteLoanVars,
  SettleLoanVars,
  UpdateLoanVars,
  mutationKeys,
  submitWrite,
} from "../lib/mutations";
import { useAuth } from "../context/AuthContext";

/**
 * The Loans tab's month view (R-41): loans visible in `month`, as of its end. Only fetched while
 * the Loans segment shows. "Pending" counts as loading, so a month never fetched (offline) doesn't
 * claim to have no loans (§5.4).
 */
export function useLoansForMonth(month: string, enabled = true) {
  const query = useQuery({
    queryKey: queryKeys.loansForMonth(month),
    queryFn: () => loansApi.fetchLoansForMonth(month),
    enabled,
  });
  return {
    loans: (query.data ?? []) as Loan[],
    isLoading: query.isPending,
    error: query.error ? String(query.error) : null,
    refetch: query.refetch,
  };
}

/**
 * Today's loans, and every loan write. Writes go through the shared mutation defaults, which
 * invalidate every money query once, instead of each caller refetching.
 */
export function useLoans(filterType?: LoanType, filterStatus?: LoanStatus) {
  const loansQuery = useQuery({
    queryKey: queryKeys.loans(filterType, filterStatus),
    queryFn: () => loansApi.fetchLoans({ type: filterType, status: filterStatus }),
  });

  // Every write goes through the shared defaults in lib/mutations.ts (function, order, errors),
  // tagged with the user so a restored queue can't replay under another account.
  const { user } = useAuth();
  const meta = { userId: user?.id };
  const add = useMutation<Loan, Error, CreateLoanVars>({ mutationKey: mutationKeys.createLoan, meta });
  const edit = useMutation<Loan, Error, UpdateLoanVars>({ mutationKey: mutationKeys.updateLoan, meta });
  const settle = useMutation<Loan, Error, SettleLoanVars>({ mutationKey: mutationKeys.settleLoan, meta });
  const remove = useMutation<void, Error, DeleteLoanVars>({ mutationKey: mutationKeys.deleteLoan, meta });

  const titleOf = (id: string) => {
    const loan = (loansQuery.data as Loan[] | undefined)?.find((l) => l.id === id);
    return loan ? `the loan with ${loan.personName}` : "a loan";
  };

  return {
    loans: (loansQuery.data ?? []) as Loan[],
    isLoading: loansQuery.isLoading,
    error: loansQuery.error ? String(loansQuery.error) : null,
    refresh: async () => {
      await loansQuery.refetch();
    },
    addLoan: (input: LoanInput) => submitWrite(add, { input, title: `the loan with ${input.personName}` }),
    editLoan: (id: string, input: Partial<LoanInput>) => submitWrite(edit, { id, input, title: titleOf(id) }),
    recordPayment: (id: string, amount?: number) =>
      submitWrite(settle, { id, amount, title: `a payment on ${titleOf(id)}` }),
    removeLoan: (id: string) => submitWrite(remove, { id, title: titleOf(id) }),
  };
}
