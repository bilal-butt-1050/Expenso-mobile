import { useCallback, useEffect, useState } from "react";
import { getErrorMessage } from "../api/client";

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
  take: number = 20
): InfiniteState<T> {
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetcher(0, take);
      setData(response.items);
      setHasMore(response.hasMore);
    } catch (err) {
      setError(getErrorMessage(err));
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
      setData((prev) => [...prev, ...response.items]);
      setHasMore(response.hasMore);
    } catch (err) {
      // Don't overwrite the main error state, just log for infinite scroll
      console.error(getErrorMessage(err));
    } finally {
      setIsFetchingMore(false);
    }
  }, [fetcher, data.length, take, isFetchingMore, hasMore]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, isLoading, isFetchingMore, hasMore, error, refetch: load, loadMore };
}
