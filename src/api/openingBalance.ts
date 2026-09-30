import { apiClient } from "./client";

/**
 * Sets the opening cash from what the user holds today (R-34): the server stores the amount that
 * makes today's Cash available equal `cashToday`.
 */
export async function setOpeningBalanceFromToday(cashToday: number): Promise<{ openingBalance: number }> {
  const { data } = await apiClient.put<{ openingBalance: number }>("/opening-balance", { cashToday });
  return data;
}
