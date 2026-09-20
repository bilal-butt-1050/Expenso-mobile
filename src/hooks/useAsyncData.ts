import { useCallback, useEffect, useState } from "react";
import { getErrorMessage } from "../api/client";
import { syncService } from "../services/syncService";

interface AsyncState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useAsyncData<T>(
  fetcher: () => Promise<T>,
  deps: unknown[],
  cacheKey?: string
): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load from offline cache immediately on mount
  useEffect(() => {
    if (cacheKey) {
      syncService.getCache<T>(cacheKey).then((cached) => {
        if (cached !== null) {
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
      const result = await fetcher();
      setData(result);
      if (cacheKey) {
        syncService.setCache(cacheKey, result);
      }
    } catch (err: any) {
      // If network error, preserve cached data silently
      if (!err.response) {
        // Keep existing cached data
      } else {
        setError(getErrorMessage(err));
      }
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    load();
  }, [load]);

  return { data, isLoading, error, refetch: load };
}
