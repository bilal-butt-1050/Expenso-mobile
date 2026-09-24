import React, { createContext, useContext, useMemo, useState } from "react";
import { currentMonthKey } from "../utils/date";

/**
 * App-wide view state. Data caching and invalidation belong to TanStack Query.
 *
 * This used to also carry `dataVersion` / `notifyDataChanged` — a hand-rolled invalidation bus
 * that every hook depended on, so any write re-ran every query in the app. Query keys handle
 * that now, and precisely.
 */
interface AppDataContextValue {
  /** "YYYY-MM" the app is currently showing. */
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
}

const AppDataContext = createContext<AppDataContextValue | undefined>(undefined);

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey());

  const value = useMemo(() => ({ selectedMonth, setSelectedMonth }), [selectedMonth]);

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppDataContextValue {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used within an AppDataProvider");
  return ctx;
}
