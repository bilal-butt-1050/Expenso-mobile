import { useState } from "react";
import axios from "axios";
import * as openingBalanceApi from "../api/openingBalance";
import { invalidateMoney } from "../lib/queryClient";
import { useAuth } from "../context/AuthContext";

/**
 * Saving the opening cash, once (R-34, D-64). Every month's cash moves, so every money query is
 * refreshed. The saved amount goes straight into the user, which moves onboarding on even if the
 * refetch after it fails.
 */
export function useOpeningBalance() {
  const { refreshUser, applyOpeningBalance } = useAuth();
  const [isSaving, setIsSaving] = useState(false);

  const save = async (cashToday: number) => {
    setIsSaving(true);
    try {
      try {
        const result = await openingBalanceApi.setOpeningBalanceFromToday(cashToday);
        invalidateMoney();
        await applyOpeningBalance(result.openingBalance);
      } catch (err) {
        // 409: it's already set, by an earlier try whose answer was lost or by the other install.
        // Take the server's figure instead of leaving the user stuck on this screen (G4 M1).
        if (axios.isAxiosError(err) && err.response?.status === 409) {
          invalidateMoney();
          await refreshUser();
          return;
        }
        throw err;
      }
      refreshUser().catch(() => {});
    } finally {
      setIsSaving(false);
    }
  };

  return { save, isSaving };
}
