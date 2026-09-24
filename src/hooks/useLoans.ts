import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as loansApi from "../api/loans";
import { Loan, LoanInput, LoansSummary, LoanStatus, LoanType } from "../types/models";
import { invalidateMoney, queryKeys } from "../lib/queryClient";

/**
 * Loans and their summary.
 *
 * The previous implementation fired four requests per mutation: each of `addLoan`,
 * `recordPayment` and `removeLoan` called `notifyDataChanged()` — which bumped a counter every
 * hook depended on — *and* called `refresh()` directly, so both paths re-fetched the list and
 * the summary. Every screen mounting `useLoans` did that independently.
 */
export function useLoans(filterType?: LoanType, filterStatus?: LoanStatus) {
  const queryClient = useQueryClient();

  const loansQuery = useQuery({
    queryKey: queryKeys.loans(filterType, filterStatus),
    queryFn: () => loansApi.fetchLoans({ type: filterType, status: filterStatus }),
  });

  const summaryQuery = useQuery({
    queryKey: queryKeys.loansSummary(),
    queryFn: loansApi.fetchLoansSummary,
  });

  // A loan movement is cash, so it moves the dashboard and the transaction feed too.
  const onChanged = () => invalidateMoney();

  const add = useMutation({ mutationFn: (input: LoanInput) => loansApi.createLoan(input), onSuccess: onChanged });

  const edit = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<LoanInput> }) =>
      loansApi.updateLoan(id, input),
    onSuccess: onChanged,
  });

  const settle = useMutation({
    mutationFn: ({ id, amount }: { id: string; amount?: number }) =>
      loansApi.settleLoan(id, amount),
    onSuccess: onChanged,
  });

  const remove = useMutation({
    mutationFn: (id: string) => loansApi.deleteLoan(id),
    // Deleting a loan cascades its movements server-side, so the feed changes too.
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["loans"] });
      const snapshot = queryClient.getQueriesData({ queryKey: ["loans"] });
      queryClient.setQueriesData({ queryKey: ["loans"] }, (old: any) =>
        Array.isArray(old) ? old.filter((l: Loan) => l.id !== id) : old
      );
      return { snapshot };
    },
    onError: (_e, _id, ctx) => {
      ctx?.snapshot?.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
    onSettled: onChanged,
  });

  return {
    loans: (loansQuery.data ?? []) as Loan[],
    summary: (summaryQuery.data ?? null) as LoansSummary | null,
    isLoading: loansQuery.isLoading || summaryQuery.isLoading,
    error: loansQuery.error ? String(loansQuery.error) : null,
    refresh: async () => {
      await Promise.all([loansQuery.refetch(), summaryQuery.refetch()]);
    },
    addLoan: add.mutateAsync,
    editLoan: (id: string, input: Partial<LoanInput>) => edit.mutateAsync({ id, input }),
    recordPayment: (id: string, amount?: number) => settle.mutateAsync({ id, amount }),
    removeLoan: remove.mutateAsync,
  };
}
