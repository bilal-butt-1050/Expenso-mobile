import { apiClient } from "./client";
import { Income, IncomeInput, IncomeSummary } from "../types/models";

export async function fetchIncomes(params?: { month?: string; status?: string }): Promise<Income[]> {
  const { data } = await apiClient.get<Income[]>("/income", { params });
  return data;
}

export async function fetchIncomeSummary(month: string): Promise<IncomeSummary> {
  const { data } = await apiClient.get<IncomeSummary>("/income/summary", { params: { month } });
  return data;
}

export async function createIncome(input: IncomeInput): Promise<Income> {
  const { data } = await apiClient.post<Income>("/income", input);
  return data;
}

export async function updateIncome(id: string, input: Partial<IncomeInput>): Promise<Income> {
  const { data } = await apiClient.put<Income>(`/income/${id}`, input);
  return data;
}

export async function toggleIncomeStatus(id: string): Promise<Income> {
  const { data } = await apiClient.patch<Income>(`/income/${id}/status`);
  return data;
}

export async function deleteIncome(id: string): Promise<void> {
  await apiClient.delete(`/income/${id}`);
}
