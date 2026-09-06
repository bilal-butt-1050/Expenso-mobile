import React, { createContext, useContext, useMemo, useState, useCallback } from "react";
import { currentMonthKey } from "../utils/date";

interface AppDataContextValue {
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  // Incremented on data changes (add/edit/delete expense, income, budget,
  // or category) so active screens automatically trigger a data refresh.
  dataVersion: number;
  notifyDataChanged: () => void;
}

const AppDataContext = createContext<AppDataContextValue | undefined>(undefined);

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey());
  const [dataVersion, setDataVersion] = useState(0);

  const notifyDataChanged = useCallback(() => setDataVersion((v) => v + 1), []);

  const value = useMemo(
    () => ({ selectedMonth, setSelectedMonth, dataVersion, notifyDataChanged }),
    [selectedMonth, dataVersion, notifyDataChanged]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppDataContextValue {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used within an AppDataProvider");
  return ctx;
}
