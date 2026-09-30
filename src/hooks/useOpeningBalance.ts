import { useState } from "react";
import * as openingBalanceApi from "../api/openingBalance";
import { invalidateMoney } from "../lib/queryClient";
import { useAuth } from "../context/AuthContext";

/**
 * Saving the opening cash (R-34). Online only: the sheet is disabled offline or with writes
 * waiting, because the figure it's based on would be stale (DESIGN S11). Every month's cash moves,
 * so every money query is refreshed, and the user (which carries the amount) is refetched.
 */
export function useOpeningBalance() {
  const { refreshUser } = useAuth();
  const [isSaving, setIsSaving] = useState(false);

  const save = async (cashToday: number) => {
    setIsSaving(true);
    try {
      const result = await openingBalanceApi.setOpeningBalanceFromToday(cashToday);
      invalidateMoney();
      await refreshUser().catch(() => {});
      return result;
    } finally {
      setIsSaving(false);
    }
  };

  return { save, isSaving };
}
