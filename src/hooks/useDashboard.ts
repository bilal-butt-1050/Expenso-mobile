import { fetchDashboardSummary } from "../api/dashboard";
import { useAppData } from "../context/AppDataContext";
import { useAsyncData } from "./useAsyncData";

export function useDashboard(overrideMonth?: string) {
  const { selectedMonth, dataVersion } = useAppData();
  const targetMonth = overrideMonth || selectedMonth;
  return useAsyncData(() => fetchDashboardSummary(targetMonth), [targetMonth, dataVersion]);
}
