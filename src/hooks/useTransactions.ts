import { useCallback } from "react";
import { useInfiniteQuery, useMutation } from "@tanstack/react-query";
import * as api from "../api/transactions";
import { Transaction, TransactionInput, TransactionKind } from "../types/models";
import { useAppData } from "../context/AppDataContext";
import { queryKeys } from "../lib/queryClient";
import {
  CreateTransactionVars,
  DeleteTransactionVars,
  UpdateTransactionVars,
  mutationKeys,
  submitWrite,
} from "../lib/mutations";
import { useAuth } from "../context/AuthContext";

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

/**
 * Create / edit / delete. The work lives in the shared defaults (lib/mutations.ts) so a write
 * queued offline replays correctly after a restart. Online, these resolve with the server's
 * answer. Offline, they queue the write and resolve at once with `undefined`.
 */
export function useTransactionMutations() {
  const { user } = useAuth();
  const meta = { userId: user?.id };

  const create = useMutation<Transaction, Error, CreateTransactionVars>({
    mutationKey: mutationKeys.createTransaction,
    meta,
  });
  const update = useMutation<Transaction, Error, UpdateTransactionVars>({
    mutationKey: mutationKeys.updateTransaction,
    meta,
  });
  const remove = useMutation<void, Error, DeleteTransactionVars>({
    mutationKey: mutationKeys.deleteTransaction,
    meta,
  });

  return {
    /** `input.id` should be a fresh client id (newTransactionId) so a replay can't duplicate. */
    createTransaction: (input: CreateTransactionVars["input"], title: string) =>
      submitWrite(create, { input, title }),
    updateTransaction: (id: string, input: Partial<TransactionInput>, title: string) =>
      submitWrite(update, { id, input, title }),
    deleteTransaction: (id: string, title: string) => submitWrite(remove, { id, title }),
    /**
     * Commit a delete nobody waits on (the swipe undo expiring). Failure shows in the snackbar
     * (S-5) and the row comes back.
     */
    commitDelete: (id: string, title: string, callbacks?: { onError?: () => void; onSettled?: () => void }) =>
      remove.mutate({ id, title, background: true }, callbacks),
  };
}
