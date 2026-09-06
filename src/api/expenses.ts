import { apiClient } from "./client";
import { Expense, ExpenseInput, ExpenseStatus } from "../types/models";

export async function fetchExpenses(filters: {
  month?: string;
  categoryId?: string;
  status?: ExpenseStatus;
}): Promise<Expense[]> {
  const { data } = await apiClient.get<Expense[]>("/expenses", { params: filters });
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
