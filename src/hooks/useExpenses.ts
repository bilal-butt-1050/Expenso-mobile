import { useCallback } from "react";
import * as expensesApi from "../api/expenses";
import { ExpenseInput, ExpenseStatus } from "../types/models";
import { useAppData } from "../context/AppDataContext";
import { useInfiniteData } from "./useInfiniteData";

export function useExpenses(filters: { categoryId?: string; status?: ExpenseStatus } = {}) {
  const { dataVersion, notifyDataChanged } = useAppData();

  const state = useInfiniteData(
    (skip, take) => expensesApi.fetchExpenses({ ...filters, skip, take }),
    [filters.categoryId, filters.status, dataVersion],
    20 // Take 20 at a time
  );

  const addExpense = useCallback(
    async (input: ExpenseInput) => {
      const result = await expensesApi.createExpense(input);
      notifyDataChanged();
      return result;
    },
    [notifyDataChanged]
  );

  const editExpense = useCallback(
    async (id: string, input: Partial<ExpenseInput>) => {
      await expensesApi.updateExpense(id, input);
      notifyDataChanged();
    },
    [notifyDataChanged]
  );

  const removeExpense = useCallback(
    async (id: string) => {
      await expensesApi.deleteExpense(id);
      notifyDataChanged();
    },
    [notifyDataChanged]
  );

  const toggleStatus = useCallback(
    async (id: string) => {
      await expensesApi.toggleExpenseStatus(id);
      notifyDataChanged();
    },
    [notifyDataChanged]
  );

  return { ...state, addExpense, editExpense, removeExpense, toggleStatus };
}
