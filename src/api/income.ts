import { apiClient } from "./client";
import { Income } from "../types/models";

export interface IncomeInput {
  month: string;
  salary: number;
  bonus: number;
  otherIncome: number;
}

export async function fetchIncome(): Promise<Income[]> {
  const { data } = await apiClient.get<Income[]>("/income");
  return data;
}

export async function saveIncome(input: IncomeInput): Promise<Income> {
  const { data } = await apiClient.put<Income>("/income", input);
  return data;
}

export async function deleteIncome(id: string): Promise<void> {
  await apiClient.delete(`/income/${id}`);
}
