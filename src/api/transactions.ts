import { apiClient } from "./client";
import { Transaction, TransactionInput, TransactionKind } from "../types/models";

export interface TransactionPage {
  items: Transaction[];
  hasMore: boolean;
  /** Keyset cursor for the next page, or null when the list is exhausted. */
  nextCursor: string | null;
}

export interface TransactionFilters {
  /** "YYYY-MM". Omit for all time. */
  month?: string;
  kinds?: TransactionKind[];
  categoryId?: string;
  limit?: number;
  cursor?: string;
}

export async function fetchTransactions(filters: TransactionFilters): Promise<TransactionPage> {
  const { data } = await apiClient.get<TransactionPage>("/transactions", {
    params: {
      ...filters,
      // The API takes a comma-separated list; axios would otherwise serialise an array as
      // repeated `kinds=` params.
      kinds: filters.kinds?.length ? filters.kinds.join(",") : undefined,
    },
  });
  return data;
}

export async function createTransaction(input: TransactionInput): Promise<Transaction> {
  const { data } = await apiClient.post<Transaction>("/transactions", input);
  return data;
}

export async function updateTransaction(
  id: string,
  input: Partial<TransactionInput>
): Promise<Transaction> {
  const { data } = await apiClient.patch<Transaction>(`/transactions/${id}`, input);
  return data;
}

export async function deleteTransaction(id: string): Promise<void> {
  await apiClient.delete(`/transactions/${id}`);
}
