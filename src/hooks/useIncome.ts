import { useCallback } from "react";
import * as incomeApi from "../api/income";
import { useAppData } from "../context/AppDataContext";
import { useAsyncData } from "./useAsyncData";

export function useIncome() {
  const { dataVersion, notifyDataChanged } = useAppData();
  const state = useAsyncData(() => incomeApi.fetchIncome(), [dataVersion]);

  const saveIncome = useCallback(
    async (input: incomeApi.IncomeInput) => {
      await incomeApi.saveIncome(input);
      notifyDataChanged();
    },
    [notifyDataChanged]
  );

  const removeIncome = useCallback(
    async (id: string) => {
      await incomeApi.deleteIncome(id);
      notifyDataChanged();
    },
    [notifyDataChanged]
  );

  return { ...state, saveIncome, removeIncome };
}
