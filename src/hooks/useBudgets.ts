import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as budgetsApi from "../api/budgets";
import { queryKeys } from "../lib/queryClient";

export function useBudgets(month: string) {
  const queryClient = useQueryClient();
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.budgets(month) });
    // budgetVsActual lives on the dashboard, so a budget change moves it too.
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const query = useQuery({
    queryKey: queryKeys.budgets(month),
    queryFn: () => budgetsApi.fetchBudgets(month),
  });

  const save = useMutation({
    mutationFn: ({ categoryId, amount }: { categoryId: string; amount: number }) =>
      budgetsApi.saveBudget(categoryId, amount, month),
    onSuccess: invalidate,
  });

  const clear = useMutation({
    mutationFn: (categoryId: string) => budgetsApi.deleteBudget(categoryId, month),
    onSuccess: invalidate,
  });

  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error ? String(query.error) : null,
    refetch: query.refetch,
    setBudget: (categoryId: string, amount: number) => save.mutateAsync({ categoryId, amount }),
    clearBudget: clear.mutateAsync,
  };
}
