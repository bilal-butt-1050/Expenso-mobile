import { useCallback } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import * as api from "../api/transactions";
import { Transaction, TransactionInput, TransactionKind } from "../types/models";
import { useAppData } from "../context/AppDataContext";
import { invalidateMoney, queryKeys } from "../lib/queryClient";

interface Options {
  /** Defaults to the month selected app-wide. Pass `null` for all time. */
  month?: string | null;
  kinds?: TransactionKind[];
  categoryId?: string;
  pageSize?: number;
}

/**
 * The transaction feed.
 *
 * `month` is finally part of both the request and the cache key. The old `useExpenses` and
 * `useIncome` never sent it — the backend supported `?month=` and the client simply didn't pass
 * it, nor include `selectedMonth` in its dependencies. So the month picker changed the dashboard
 * numbers while the list underneath them kept showing the most recent items of all time, and
 * Home's "No recent activity logged this month" was reporting on all-time data.
 */
export function useTransactions(options: Options = {}) {
  const { selectedMonth } = useAppData();
  const month = options.month === null ? undefined : options.month ?? selectedMonth;
  const pageSize = options.pageSize ?? 30;

  const query = useInfiniteQuery({
    queryKey: [...queryKeys.transactions(month, options.kinds), options.categoryId ?? "all"],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      api.fetchTransactions({
        month,
        kinds: options.kinds,
        categoryId: options.categoryId,
        limit: pageSize,
        cursor: pageParam,
      }),
    // Keyset cursor, not an offset. Dates are day-level so ties are the norm, and offset paging
    // over `ORDER BY date DESC` silently duplicated and dropped rows between pages.
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

  const items: Transaction[] = query.data?.pages.flatMap((p) => p.items) ?? [];

  return {
    items,
    isLoading: query.isLoading,
    isRefreshing: query.isRefetching && !query.isFetchingNextPage,
    isFetchingMore: query.isFetchingNextPage,
    hasMore: query.hasNextPage,
    error: query.error,
    refetch: query.refetch,
    loadMore: useCallback(() => {
      if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage();
    }, [query]),
  };
}

/** Create / edit / delete, each invalidating everything the amount can move. */
export function useTransactionMutations() {
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: (input: TransactionInput) => api.createTransaction(input),
    onSuccess: invalidateMoney,
  });

  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<TransactionInput> }) =>
      api.updateTransaction(id, input),
    onSuccess: invalidateMoney,
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.deleteTransaction(id),
    // Drop the row immediately, then reconcile. Restores the previous pages if the server
    // refuses — which it does for loan-linked rows, with a 409.
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["transactions"] });
      const snapshot = queryClient.getQueriesData({ queryKey: ["transactions"] });
      queryClient.setQueriesData({ queryKey: ["transactions"] }, (old: any) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: api.TransactionPage) => ({
            ...page,
            items: page.items.filter((t) => t.id !== id),
          })),
        };
      });
      return { snapshot };
    },
    onError: (_err, _id, context) => {
      context?.snapshot?.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
    onSettled: invalidateMoney,
  });

  return {
    createTransaction: create.mutateAsync,
    updateTransaction: update.mutateAsync,
    deleteTransaction: remove.mutateAsync,
    isCreating: create.isPending,
    isUpdating: update.isPending,
    isDeleting: remove.isPending,
  };
}
