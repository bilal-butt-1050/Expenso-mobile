import { fetchDashboardSummary } from "../api/dashboard";
import { useAppData } from "../context/AppDataContext";
import { useAsyncData } from "./useAsyncData";

export function useDashboard() {
  const { selectedMonth, dataVersion } = useAppData();
  return useAsyncData(() => fetchDashboardSummary(selectedMonth), [selectedMonth, dataVersion]);
}
