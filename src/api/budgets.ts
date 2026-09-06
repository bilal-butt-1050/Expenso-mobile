import { apiClient } from "./client";
import { Budget } from "../types/models";

export async function fetchBudgets(): Promise<Budget[]> {
  const { data } = await apiClient.get<Budget[]>("/budgets");
  return data;
}

export async function saveBudget(categoryId: string, amount: number): Promise<Budget> {
  const { data } = await apiClient.put<Budget>("/budgets", { categoryId, amount });
  return data;
}

export async function deleteBudget(categoryId: string): Promise<void> {
  await apiClient.delete(`/budgets/${categoryId}`);
}
