import { apiClient } from "./client";
import { Expense, ExpenseInput, ExpenseStatus } from "../types/models";

export async function fetchExpenses(filters: {
  categoryId?: string;
  status?: ExpenseStatus;
  skip?: number;
  take?: number;
}): Promise<{ items: Expense[]; hasMore: boolean }> {
  const { data } = await apiClient.get<{ items: Expense[]; hasMore: boolean }>("/expenses", { params: filters });
  return data;
}

export async function createExpense(input: ExpenseInput): Promise<Expense> {
  const { data } = await apiClient.post<Expense>("/expenses", input);
  return data;
}

export async function updateExpense(id: string, input: Partial<ExpenseInput>): Promise<Expense> {
  const { data } = await apiClient.put<Expense>(`/expenses/${id}`, input);
  return data;
}

export async function deleteExpense(id: string): Promise<void> {
  await apiClient.delete(`/expenses/${id}`);
}

export async function toggleExpenseStatus(id: string): Promise<Expense> {
  const { data } = await apiClient.patch<Expense>(`/expenses/${id}/toggle-status`);
  return data;
}
