import { apiClient } from "./client";
import { Budget } from "../types/models";

export async function fetchBudgets(month: string): Promise<Budget[]> {
  const { data } = await apiClient.get<Budget[]>(`/budgets?month=${month}`);
  return data;
}

export async function saveBudget(categoryId: string, amount: number, month: string): Promise<Budget> {
  const { data } = await apiClient.put<Budget>("/budgets", { categoryId, amount, month });
  return data;
}

export async function deleteBudget(categoryId: string, month: string): Promise<void> {
  await apiClient.delete(`/budgets/${categoryId}?month=${month}`);
}
