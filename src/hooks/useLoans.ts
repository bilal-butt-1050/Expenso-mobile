import { useState, useEffect, useCallback } from "react";
import * as loansApi from "../api/loans";
import { Loan, LoanInput, LoansSummary, LoanType, LoanStatus } from "../types/models";
import { getErrorMessage } from "../api/client";
import { useAppData } from "../context/AppDataContext";
import { syncService } from "../services/syncService";

export function useLoans(filterType?: LoanType, filterStatus?: LoanStatus) {
  const { dataVersion, notifyDataChanged } = useAppData();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [summary, setSummary] = useState<LoansSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load from offline cache initially and whenever dataVersion or filters change
  useEffect(() => {
    syncService.getCache<Loan[]>("loans").then((cachedLoans) => {
      if (cachedLoans) {
        let filtered = cachedLoans;
        if (filterType) filtered = filtered.filter((l) => l.type === filterType);
        if (filterStatus) filtered = filtered.filter((l) => l.status === filterStatus);
        setLoans(filtered);
      }
    });
    syncService.getCache<LoansSummary>("loans_summary").then((cachedSummary) => {
      if (cachedSummary) setSummary(cachedSummary);
    });
  }, [dataVersion, filterType, filterStatus]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [loansData, summaryData] = await Promise.all([
        loansApi.fetchLoans({ type: filterType, status: filterStatus }),
        loansApi.fetchLoansSummary(),
      ]);
      setLoans(loansData);
      setSummary(summaryData);
      // Only write to main cache when unfiltered so we preserve all loans
      if (!filterType && !filterStatus) {
        syncService.setCache("loans", loansData);
        syncService.setCache("loans_summary", summaryData);
      }
    } catch (err: any) {
      if (!err.response) {
        // Silently preserve offline cached loans
      } else {
        setError(getErrorMessage(err));
      }
    } finally {
      setIsLoading(false);
    }
  }, [filterType, filterStatus]);

  useEffect(() => {
    refresh();
  }, [refresh, dataVersion]);

  const addLoan = async (input: LoanInput): Promise<Loan> => {
    try {
      const created = await loansApi.createLoan(input);
      // Immediately and optimistically update the cache and state for instant UI reflection
      const cached = (await syncService.getCache<Loan[]>("loans")) || [];
      const next = [created, ...cached.filter((l) => l.id !== created.id)];
      await syncService.setCache("loans", next);
      setLoans(next);
      notifyDataChanged();
      // Background re-fetch to sync summary calculations
      refresh().catch(() => {});
      return created;
    } catch (err: any) {
      if (!err.response) {
        const localItem: Loan = {
          id: `temp-${Date.now()}`,
          userId: "offline",
          type: input.type,
          personName: input.personName,
          amount: input.amount,
          settledAmount: 0,
          status: "PENDING",
          dueDate: input.dueDate || null,
          notes: input.notes || null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await syncService.queueAction("CREATE_LOAN", input);
        const cached = (await syncService.getCache<Loan[]>("loans")) || [];
        const next = [localItem, ...cached];
        await syncService.setCache("loans", next);
        setLoans(next);
        notifyDataChanged();
        return localItem;
      }
      throw err;
    }
  };

  const recordPayment = async (id: string, paymentAmount?: number) => {
    try {
      const updated = await loansApi.settleLoan(id, paymentAmount);
      const cached = (await syncService.getCache<Loan[]>("loans")) || [];
      const updatedList = cached.map((l) => (l.id === id ? updated : l));
      await syncService.setCache("loans", updatedList);
      setLoans(updatedList);
      notifyDataChanged();
      refresh().catch(() => {});
      return updated;
    } catch (err: any) {
      if (!err.response) {
        await syncService.queueAction("SETTLE_LOAN", { id, amount: paymentAmount });
        const cached = (await syncService.getCache<Loan[]>("loans")) || [];
        const updatedList = cached.map((l) => {
          if (l.id === id) {
            const newSettled = paymentAmount ? Math.min(l.amount, l.settledAmount + paymentAmount) : l.amount;
            return {
              ...l,
              settledAmount: newSettled,
              status: (newSettled >= l.amount ? "SETTLED" : "PARTIAL") as LoanStatus,
            };
          }
          return l;
        });
        await syncService.setCache("loans", updatedList);
        setLoans(updatedList);
        notifyDataChanged();
        return updatedList.find((l) => l.id === id);
      }
      throw err;
    }
  };

  const removeLoan = async (id: string) => {
    try {
      await loansApi.deleteLoan(id);
      const cached = (await syncService.getCache<Loan[]>("loans")) || [];
      const next = cached.filter((l) => l.id !== id);
      await syncService.setCache("loans", next);
      setLoans(next);
      notifyDataChanged();
      refresh().catch(() => {});
    } catch (err: any) {
      if (!err.response) {
        await syncService.queueAction("DELETE_LOAN", { id });
        const cached = (await syncService.getCache<Loan[]>("loans")) || [];
        const next = cached.filter((l) => l.id !== id);
        await syncService.setCache("loans", next);
        setLoans(next);
        notifyDataChanged();
      } else {
        throw err;
      }
    }
  };

  return {
    loans,
    summary,
    isLoading,
    error,
    refresh,
    addLoan,
    recordPayment,
    removeLoan,
  };
}
