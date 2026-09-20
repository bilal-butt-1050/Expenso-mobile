import { useCallback, useEffect, useState } from "react";
import { getErrorMessage } from "../api/client";
import { syncService } from "../services/syncService";

interface PaginatedResponse<T> {
  items: T[];
  hasMore: boolean;
}

interface InfiniteState<T> {
  data: T[];
  isLoading: boolean;
  isFetchingMore: boolean;
  hasMore: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  loadMore: () => Promise<void>;
}

export function useInfiniteData<T>(
  fetcher: (skip: number, take: number) => Promise<PaginatedResponse<T>>,
  deps: unknown[],
  take: number = 20,
  cacheKey?: string
): InfiniteState<T> {
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Restore cached list on mount
  useEffect(() => {
    if (cacheKey) {
      syncService.getCache<T[]>(cacheKey).then((cached) => {
        if (cached && cached.length > 0) {
          setData(cached);
          setIsLoading(false);
        }
      });
    }
  }, [cacheKey]);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetcher(0, take);
      setData(response.items);
      setHasMore(response.hasMore);
      if (cacheKey && response.items) {
        syncService.setCache(cacheKey, response.items);
      }
    } catch (err: any) {
      // If offline, silently retain existing cached items
      if (!err.response) {
        // Keep cached data
      } else {
        setError(getErrorMessage(err));
      }
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const loadMore = useCallback(async () => {
    if (isFetchingMore || !hasMore) return;
    setIsFetchingMore(true);
    try {
      const response = await fetcher(data.length, take);
      setData((prev) => {
        const next = [...prev, ...response.items];
        if (cacheKey) syncService.setCache(cacheKey, next);
        return next;
      });
      setHasMore(response.hasMore);
    } catch (err) {
      console.error(getErrorMessage(err));
    } finally {
      setIsFetchingMore(false);
    }
  }, [fetcher, data.length, take, isFetchingMore, hasMore, cacheKey]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, isLoading, isFetchingMore, hasMore, error, refetch: load, loadMore };
}
