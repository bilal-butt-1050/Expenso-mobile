import { useCallback } from "react";
import * as incomeApi from "../api/income";
import { Income, IncomeInput } from "../types/models";
import { useAppData } from "../context/AppDataContext";
import { useInfiniteData } from "./useInfiniteData";
import { syncService } from "../services/syncService";

export function useIncome() {
  const { dataVersion, notifyDataChanged } = useAppData();

  const state = useInfiniteData(
    (skip, take) => incomeApi.fetchIncomes({ skip, take }),
    [dataVersion],
    20, // Take 20 at a time
    "incomes"
  );

  const addIncome = useCallback(
    async (input: IncomeInput): Promise<Income> => {
      try {
        const res = await incomeApi.createIncome(input);
        notifyDataChanged();
        return res;
      } catch (err: any) {
        if (!err.response) {
          const localItem: Income = {
            id: `temp-${Date.now()}`,
            userId: "offline",
            date: input.date || new Date().toISOString(),
            month: (input.date || new Date().toISOString()).slice(0, 7),
            source: input.source,
            amount: input.amount,
            paymentMethod: input.paymentMethod || "Direct Deposit",
            description: input.description || null,
            sourceIcon: input.sourceIcon || "wallet-plus-outline",
            sourceColor: input.sourceColor || "#10B981",
          };
          await syncService.queueAction("CREATE_INCOME", input);
          const cached = (await syncService.getCache<Income[]>("incomes")) || [];
          await syncService.setCache("incomes", [localItem, ...cached]);
          notifyDataChanged();
          return localItem;
        }
        throw err;
      }
    },
    [notifyDataChanged]
  );

  const editIncome = useCallback(
    async (id: string, input: Partial<IncomeInput>) => {
      try {
        const res = await incomeApi.updateIncome(id, input);
        notifyDataChanged();
        return res;
      } catch (err: any) {
        if (!err.response) {
          const cached = (await syncService.getCache<Income[]>("incomes")) || [];
          const updated = cached.map((i) => (i.id === id ? { ...i, ...input } : i));
          await syncService.setCache("incomes", updated);
          notifyDataChanged();
        } else {
          throw err;
        }
      }
    },
    [notifyDataChanged]
  );

  const removeIncome = useCallback(
    async (id: string) => {
      try {
        await incomeApi.deleteIncome(id);
      } catch (err: any) {
        if (!err.response) {
          await syncService.queueAction("DELETE_INCOME", { id });
          const cached = (await syncService.getCache<Income[]>("incomes")) || [];
          await syncService.setCache(
            "incomes",
            cached.filter((i) => i.id !== id)
          );
        } else {
          throw err;
        }
      }
      notifyDataChanged();
    },
    [notifyDataChanged]
  );

  return { ...state, addIncome, editIncome, removeIncome };
}
