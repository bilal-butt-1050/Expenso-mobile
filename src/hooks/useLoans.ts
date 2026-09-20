import { useState, useEffect, useCallback } from "react";
import * as loansApi from "../api/loans";
import { Loan, LoanInput, LoansSummary, LoanType, LoanStatus } from "../types/models";
import { getErrorMessage } from "../api/client";

export function useLoans(filterType?: LoanType, filterStatus?: LoanStatus) {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [summary, setSummary] = useState<LoansSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [filterType, filterStatus]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addLoan = async (input: LoanInput) => {
    const created = await loansApi.createLoan(input);
    await refresh();
    return created;
  };

  const recordPayment = async (id: string, paymentAmount?: number) => {
    const updated = await loansApi.settleLoan(id, paymentAmount);
    await refresh();
    return updated;
  };

  const removeLoan = async (id: string) => {
    await loansApi.deleteLoan(id);
    await refresh();
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
