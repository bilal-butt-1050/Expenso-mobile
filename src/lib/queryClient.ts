import { QueryClient } from "@tanstack/react-query";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Replaces the hand-rolled caching in `useAsyncData` / `useInfiniteData` / `syncService`.
 *
 * Those had documented races: the cache-restore effect and the initial load both wrote `data`
 * and `isLoading` with no ordering guarantee, and `loadMore` used `data.length` as the skip
 * offset against a cache that could be a different length than the server had paginated, so
 * infinite scroll duplicated and dropped rows.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Financial data is small and changes rarely; a short stale window keeps screens snappy
      // without hammering the API on every focus.
      staleTime: 30_000,
      gcTime: 24 * 60 * 60 * 1000,
      retry: (failureCount, error: any) => {
        // A 4xx will not become a 2xx by asking again. Retry only transport failures.
        const status = error?.response?.status;
        if (status && status >= 400 && status < 500) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      // Mutations made offline stay paused and replay when connectivity returns, rather than
      // failing into a bespoke outbox.
      networkMode: "offlineFirst",
      retry: 0,
    },
  },
});

/**
 * Cache keys are namespaced per user.
 *
 * Previously everything lived under a single global key (`@expenso_cache_expenses`), and logout
 * cleared only the auth token — so signing in as a different account on the same device showed
 * the previous user's transactions until the network call replaced them.
 */
export function persisterForUser(userId: string) {
  return createAsyncStoragePersister({
    storage: AsyncStorage,
    key: `@expenso_query_cache_${userId}`,
    throttleTime: 1000,
  });
}

/** Wipe every cached query and any pending mutation. Called on logout. */
export async function clearAllCaches(userId?: string): Promise<void> {
  queryClient.clear();
  try {
    const keys = await AsyncStorage.getAllKeys();
    const ours = keys.filter(
      (k) =>
        k.startsWith("@expenso_query_cache_") ||
        // Legacy keys written by the old syncService. Removed so a stale global cache cannot
        // resurface for the next account to sign in.
        k.startsWith("@expenso_cache_") ||
        k === "@expenso_sync_outbox"
    );
    if (ours.length) await AsyncStorage.multiRemove(ours);
  } catch {
    // Storage unavailable — the in-memory clear above is still the important half.
  }
  void userId;
}

/** One place for query keys, so invalidation cannot drift from the fetchers. */
export const queryKeys = {
  transactions: (month?: string, kinds?: string[]) =>
    ["transactions", month ?? "all", kinds?.join(",") ?? "all"] as const,
  dashboard: (month: string) => ["dashboard", month] as const,
  loans: (type?: string, status?: string) =>
    ["loans", type ?? "all", status ?? "all"] as const,
  loansSummary: () => ["loans", "summary"] as const,
  categories: () => ["categories"] as const,
  budgets: (month: string) => ["budgets", month] as const,
};

/**
 * Anything a write can move. Amounts feed the dashboard, budgets and the transaction feed at
 * once, so a single mutation invalidates all of them rather than each caller remembering to.
 */
export function invalidateMoney() {
  queryClient.invalidateQueries({ queryKey: ["transactions"] });
  queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  queryClient.invalidateQueries({ queryKey: ["loans"] });
  queryClient.invalidateQueries({ queryKey: ["budgets"] });
}
