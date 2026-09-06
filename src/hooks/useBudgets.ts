import { useCallback } from "react";
import * as budgetsApi from "../api/budgets";
import { useAppData } from "../context/AppDataContext";
import { useAsyncData } from "./useAsyncData";

export function useBudgets() {
  const { dataVersion, notifyDataChanged } = useAppData();
  const state = useAsyncData(() => budgetsApi.fetchBudgets(), [dataVersion]);

  const setBudget = useCallback(
    async (categoryId: string, amount: number) => {
      await budgetsApi.saveBudget(categoryId, amount);
      notifyDataChanged();
    },
    [notifyDataChanged]
  );

  const clearBudget = useCallback(
    async (categoryId: string) => {
      await budgetsApi.deleteBudget(categoryId);
      notifyDataChanged();
    },
    [notifyDataChanged]
  );

  return { ...state, setBudget, clearBudget };
}
