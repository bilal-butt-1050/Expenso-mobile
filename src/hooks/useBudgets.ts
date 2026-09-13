import { useCallback } from "react";
import * as budgetsApi from "../api/budgets";
import { useAppData } from "../context/AppDataContext";
import { useAsyncData } from "./useAsyncData";

export function useBudgets(month: string) {
  const { dataVersion, notifyDataChanged } = useAppData();
  const state = useAsyncData(() => budgetsApi.fetchBudgets(month), [dataVersion, month]);

  const setBudget = useCallback(
    async (categoryId: string, amount: number) => {
      await budgetsApi.saveBudget(categoryId, amount, month);
      notifyDataChanged();
    },
    [month, notifyDataChanged]
  );

  const clearBudget = useCallback(
    async (categoryId: string) => {
      await budgetsApi.deleteBudget(categoryId, month);
      notifyDataChanged();
    },
    [month, notifyDataChanged]
  );

  return { ...state, setBudget, clearBudget };
}
