import { useQuery } from "@tanstack/react-query";
import { fetchDashboardSummary } from "../api/dashboard";
import { useAppData } from "../context/AppDataContext";
import { queryKeys } from "../lib/queryClient";
import { DashboardSummary } from "../types/models";

/**
 * A summary persisted by an older app version lacks the point-in-time fields, and would render as
 * "Rs NaN" until the refetch lands, or indefinitely while offline. Treat it as no data instead.
 * (A persister `buster` would also fix this, but it discards the whole persisted client, including
 * writes queued offline.)
 */
function hasCurrentShape(d: DashboardSummary | undefined): d is DashboardSummary {
  return (
    !!d &&
    typeof d.closingNetWorth === "number" &&
    typeof d.openingNetWorth === "number" &&
    typeof d.closingCash === "number" &&
    typeof d.savingsThisMonth === "number"
  );
}

export function useDashboard(overrideMonth?: string) {
  const { selectedMonth } = useAppData();
  const month = overrideMonth || selectedMonth;

  const query = useQuery({
    queryKey: queryKeys.dashboard(month),
    queryFn: () => fetchDashboardSummary(month),
  });

  return {
    data: hasCurrentShape(query.data) ? query.data : null,
    isLoading: query.isLoading,
    // The raw error, so screens can pass it to getErrorMessage.
    error: query.error,
    /** The fetch is waiting for the network to come back (TanStack pauses rather than failing). */
    isOffline: query.fetchStatus === "paused",
    refetch: query.refetch,
  };
}
