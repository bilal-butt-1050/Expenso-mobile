import { useCallback } from "react";
import * as expensesApi from "../api/expenses";
import { ExpenseInput, ExpenseStatus } from "../types/models";
import { useAppData } from "../context/AppDataContext";
import { useAsyncData } from "./useAsyncData";

export function useExpenses(filters: { categoryId?: string; status?: ExpenseStatus } = {}) {
  const { selectedMonth, dataVersion, notifyDataChanged } = useAppData();

  const state = useAsyncData(
    () => expensesApi.fetchExpenses({ month: selectedMonth, ...filters }),
    [selectedMonth, filters.categoryId, filters.status, dataVersion]
  );

  const addExpense = useCallback(
    async (input: ExpenseInput) => {
      await expensesApi.createExpense(input);
      notifyDataChanged();
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
