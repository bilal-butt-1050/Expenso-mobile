import { apiClient } from "./client";
import { Income, IncomeInput, IncomeSummary } from "../types/models";

export async function fetchIncomes(params?: {
  skip?: number;
  take?: number;
}): Promise<{ items: Income[]; hasMore: boolean }> {
  const { data } = await apiClient.get<{ items: Income[]; hasMore: boolean }>("/income", { params });
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

export async function deleteIncome(id: string): Promise<void> {
  await apiClient.delete(`/income/${id}`);
}
