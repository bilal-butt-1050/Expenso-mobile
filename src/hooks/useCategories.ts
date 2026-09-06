import { useCallback } from "react";
import * as categoriesApi from "../api/categories";
import { useAppData } from "../context/AppDataContext";
import { useAsyncData } from "./useAsyncData";

export function useCategories() {
  const { dataVersion, notifyDataChanged } = useAppData();
  const state = useAsyncData(() => categoriesApi.fetchCategories(), [dataVersion]);

  const addCategory = useCallback(
    async (input: categoriesApi.CategoryInput) => {
      const category = await categoriesApi.createCategory(input);
      notifyDataChanged();
      return category;
    },
    [notifyDataChanged]
  );

  const editCategory = useCallback(
    async (id: string, input: Partial<categoriesApi.CategoryInput>) => {
      await categoriesApi.updateCategory(id, input);
      notifyDataChanged();
    },
    [notifyDataChanged]
  );

  const removeCategory = useCallback(
    async (id: string) => {
      const result = await categoriesApi.deleteCategory(id);
      notifyDataChanged();
      return result;
    },
    [notifyDataChanged]
  );

  return { ...state, addCategory, editCategory, removeCategory };
}
