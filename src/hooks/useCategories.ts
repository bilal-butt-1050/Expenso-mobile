import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as categoriesApi from "../api/categories";
import { queryKeys } from "../lib/queryClient";

export function useCategories() {
  const queryClient = useQueryClient();
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.categories() });
    // A renamed or recoloured category changes how every transaction renders.
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const query = useQuery({
    queryKey: queryKeys.categories(),
    queryFn: categoriesApi.fetchCategories,
    // Categories change rarely and every form depends on them.
    staleTime: 5 * 60 * 1000,
  });

  const add = useMutation({ mutationFn: categoriesApi.createCategory, onSuccess: invalidate });
  const edit = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<categoriesApi.CategoryInput> }) =>
      categoriesApi.updateCategory(id, input),
    onSuccess: invalidate,
  });
  const remove = useMutation({ mutationFn: categoriesApi.deleteCategory, onSuccess: invalidate });

  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error ? String(query.error) : null,
    refetch: query.refetch,
    addCategory: add.mutateAsync,
    editCategory: (id: string, input: Partial<categoriesApi.CategoryInput>) =>
      edit.mutateAsync({ id, input }),
    removeCategory: remove.mutateAsync,
  };
}
