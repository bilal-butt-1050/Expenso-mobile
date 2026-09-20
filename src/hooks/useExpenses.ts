import { useCallback } from "react";
import * as expensesApi from "../api/expenses";
import { Expense, ExpenseInput, ExpenseStatus } from "../types/models";
import { useAppData } from "../context/AppDataContext";
import { useInfiniteData } from "./useInfiniteData";
import { syncService } from "../services/syncService";

export function useExpenses(filters: { categoryId?: string; status?: ExpenseStatus } = {}) {
  const { dataVersion, notifyDataChanged } = useAppData();

  const state = useInfiniteData(
    (skip, take) => expensesApi.fetchExpenses({ ...filters, skip, take }),
    [filters.categoryId, filters.status, dataVersion],
    20, // Take 20 at a time
    filters.categoryId ? undefined : "expenses"
  );

  const addExpense = useCallback(
    async (input: ExpenseInput): Promise<Expense> => {
      try {
        const result = await expensesApi.createExpense(input);
        notifyDataChanged();
        return result;
      } catch (err: any) {
        if (!err.response) {
          // Offline: create optimistic local expense and queue action
          const localItem: Expense = {
            id: `temp-${Date.now()}`,
            categoryId: input.categoryId,
            date: input.date || new Date().toISOString(),
            month: (input.date || new Date().toISOString()).slice(0, 7),
            description: input.description || null,
            amount: input.amount,
            paymentMethod: input.paymentMethod || "Cash",
            needWant: input.needWant || "Need",
            status: "Paid",
            category: {
              id: input.categoryId,
              name: "Expense",
              icon: "credit-card-outline",
              color: "#6366F1",
              isDefault: false,
            },
          };
          await syncService.queueAction("CREATE_EXPENSE", input);
          const cached = (await syncService.getCache<Expense[]>("expenses")) || [];
          await syncService.setCache("expenses", [localItem, ...cached]);
          notifyDataChanged();
          return localItem;
        }
        throw err;
      }
    },
    [notifyDataChanged]
  );

  const editExpense = useCallback(
    async (id: string, input: Partial<ExpenseInput>) => {
      try {
        await expensesApi.updateExpense(id, input);
      } catch (err: any) {
        if (!err.response) {
          // Update cached item optimistically
          const cached = (await syncService.getCache<Expense[]>("expenses")) || [];
          const updated = cached.map((e) => (e.id === id ? { ...e, ...input } : e));
          await syncService.setCache("expenses", updated);
        } else {
          throw err;
        }
      }
      notifyDataChanged();
    },
    [notifyDataChanged]
  );

  const removeExpense = useCallback(
    async (id: string) => {
      try {
        await expensesApi.deleteExpense(id);
      } catch (err: any) {
        if (!err.response) {
          await syncService.queueAction("DELETE_EXPENSE", { id });
          const cached = (await syncService.getCache<Expense[]>("expenses")) || [];
          await syncService.setCache(
            "expenses",
            cached.filter((e) => e.id !== id)
          );
        } else {
          throw err;
        }
      }
      notifyDataChanged();
    },
    [notifyDataChanged]
  );

  const toggleStatus = useCallback(
    async (id: string) => {
      try {
        await expensesApi.toggleExpenseStatus(id);
      } catch {}
      notifyDataChanged();
    },
    [notifyDataChanged]
  );

  return { ...state, addExpense, editExpense, removeExpense, toggleStatus };
}
