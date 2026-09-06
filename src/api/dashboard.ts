import { apiClient } from "./client";
import { DashboardSummary } from "../types/models";

export async function fetchDashboardSummary(month: string): Promise<DashboardSummary> {
  const { data } = await apiClient.get<DashboardSummary>("/dashboard/summary", { params: { month } });
  return data;
}
