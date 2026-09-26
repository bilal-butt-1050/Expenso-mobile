import { useQuery } from "@tanstack/react-query";
import { fetchDashboardSummary } from "../api/dashboard";
import { useAppData } from "../context/AppDataContext";
import { queryKeys } from "../lib/queryClient";

export function useDashboard(overrideMonth?: string) {
  const { selectedMonth } = useAppData();
  const month = overrideMonth || selectedMonth;

  const query = useQuery({
    queryKey: queryKeys.dashboard(month),
    queryFn: () => fetchDashboardSummary(month),
  });

  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    // The raw error, so screens can pass it to getErrorMessage.
    error: query.error,
    refetch: query.refetch,
  };
}
