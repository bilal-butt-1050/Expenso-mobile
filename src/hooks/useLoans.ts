import { useMutation, useQuery } from "@tanstack/react-query";
import * as loansApi from "../api/loans";
import { Loan, LoanInput, LoansSummary, LoanStatus, LoanType } from "../types/models";
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
 * Loans and their summary.
 *
 * The previous implementation fired four requests per mutation: each of `addLoan`,
 * `recordPayment` and `removeLoan` called `notifyDataChanged()` — which bumped a counter every
 * hook depended on — *and* called `refresh()` directly, so both paths re-fetched the list and
 * the summary. Every screen mounting `useLoans` did that independently.
 */
export function useLoans(filterType?: LoanType, filterStatus?: LoanStatus) {
  const loansQuery = useQuery({
    queryKey: queryKeys.loans(filterType, filterStatus),
    queryFn: () => loansApi.fetchLoans({ type: filterType, status: filterStatus }),
  });

  const summaryQuery = useQuery({
    queryKey: queryKeys.loansSummary(),
    queryFn: loansApi.fetchLoansSummary,
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
    summary: (summaryQuery.data ?? null) as LoansSummary | null,
    isLoading: loansQuery.isLoading || summaryQuery.isLoading,
    error: loansQuery.error ? String(loansQuery.error) : null,
    refresh: async () => {
      await Promise.all([loansQuery.refetch(), summaryQuery.refetch()]);
    },
    addLoan: (input: LoanInput) => submitWrite(add, { input, title: `the loan with ${input.personName}` }),
    editLoan: (id: string, input: Partial<LoanInput>) => submitWrite(edit, { id, input, title: titleOf(id) }),
    recordPayment: (id: string, amount?: number) =>
      submitWrite(settle, { id, amount, title: `a payment on ${titleOf(id)}` }),
    removeLoan: (id: string) => submitWrite(remove, { id, title: titleOf(id) }),
  };
}
