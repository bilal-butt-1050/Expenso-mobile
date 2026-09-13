import { useCallback } from "react";
import * as incomeApi from "../api/income";
import { IncomeInput } from "../types/models";
import { useAppData } from "../context/AppDataContext";
import { useInfiniteData } from "./useInfiniteData";

export function useIncome() {
  const { dataVersion, notifyDataChanged } = useAppData();

  const state = useInfiniteData(
    (skip, take) => incomeApi.fetchIncomes({ skip, take }),
    [dataVersion],
    20 // Take 20 at a time
  );

  const addIncome = useCallback(
    async (input: IncomeInput) => {
      const res = await incomeApi.createIncome(input);
      notifyDataChanged();
      return res;
    },
    [notifyDataChanged]
  );

  const editIncome = useCallback(
    async (id: string, input: Partial<IncomeInput>) => {
      const res = await incomeApi.updateIncome(id, input);
      notifyDataChanged();
      return res;
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

  return { ...state, addIncome, editIncome, removeIncome };
}
