import { apiClient } from "./client";
import { Category } from "../types/models";

export interface CategoryInput {
  name: string;
  icon: string;
  color: string;
}

export async function fetchCategories(): Promise<Category[]> {
  const { data } = await apiClient.get<Category[]>("/categories");
  return data;
}

export async function createCategory(input: CategoryInput): Promise<Category> {
  const { data } = await apiClient.post<Category>("/categories", input);
  return data;
}

export async function updateCategory(id: string, input: Partial<CategoryInput>): Promise<Category> {
  const { data } = await apiClient.put<Category>(`/categories/${id}`, input);
  return data;
}

export async function deleteCategory(id: string): Promise<{ movedTo: string }> {
  const { data } = await apiClient.delete<{ movedTo: string }>(`/categories/${id}`);
  return data;
}
