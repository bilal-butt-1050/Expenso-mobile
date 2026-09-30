import { apiClient } from "./client";
import { Loan, LoanInput, LoansSummary, LoanType, LoanStatus } from "../types/models";

export async function fetchLoans(params?: {
  type?: LoanType;
  status?: LoanStatus;
}): Promise<Loan[]> {
  const { data } = await apiClient.get<Loan[]>("/loans", { params });
  return data;
}

/** The loans visible in `month`, each with its position as of that month's end in `asOf` (R-41). */
export async function fetchLoansForMonth(month: string): Promise<Loan[]> {
  const { data } = await apiClient.get<Loan[]>("/loans", { params: { month } });
  return data;
}

export async function fetchLoansSummary(): Promise<LoansSummary> {
  const { data } = await apiClient.get<LoansSummary>("/loans/summary");
  return data;
}

export async function createLoan(input: LoanInput): Promise<Loan> {
  const { data } = await apiClient.post<Loan>("/loans", input);
  return data;
}

export async function settleLoan(id: string, paymentAmount?: number): Promise<Loan> {
  const { data } = await apiClient.patch<Loan>(`/loans/${id}/settle`, { paymentAmount });
  return data;
}

export async function updateLoan(id: string, input: Partial<LoanInput>): Promise<Loan> {
  const { data } = await apiClient.patch<Loan>(`/loans/${id}`, input);
  return data;
}

export async function deleteLoan(id: string): Promise<void> {
  await apiClient.delete(`/loans/${id}`);
}
