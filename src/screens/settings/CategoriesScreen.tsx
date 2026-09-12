import React from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useCategories } from "../../hooks/useCategories";
import { useDialog } from "../../context/DialogContext";
import { EmptyState } from "../../components/EmptyState";
import { SkeletonList } from "../../components/Skeleton";
import { CategoryPill } from "../../components/CategoryPill";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { RootStackParamList } from "../../types/navigation";
import { getErrorMessage } from "../../api/client";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function CategoriesScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { data: categories, isLoading, removeCategory } = useCategories();
  const { confirm, alert, showToast } = useDialog();

  const confirmDelete = (id: string, name: string) => {
    confirm({
      title: `Delete "${name}"?`,
      message: 'Any expenses in this category will move to "Other" — nothing gets lost.',
      confirmText: "Delete",
      destructive: true,
      icon: "trash-can-outline",
      onConfirm: async () => {
        try {
          await removeCategory(id);
          showToast({ message: `"${name}" deleted`, type: "success" });
        } catch (err) {
          alert({
            title: "Couldn't delete category",
            message: getErrorMessage(err),
            icon: "alert-circle-outline",
          });
        }
      },
    });
  };

  const bottomOffset = Math.max(insets.bottom, spacing.md) + spacing.md;

  return (
    <View style={styles.container}>
      <FlatList
        data={categories ?? []}
        keyExtractor={(item) => item.id}
        refreshing={isLoading}
        contentContainerStyle={[styles.list, { paddingBottom: 80 + bottomOffset }]}
        ListEmptyComponent={
          isLoading ? (
            <SkeletonList />
          ) : (
            <EmptyState icon="shape-outline" title="No categories" />
          )
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} onPress={() => navigation.navigate("CategoryForm", { category: item })}>
            <CategoryPill icon={item.icon} color={item.color} />
            <Text style={styles.label}>{item.name}</Text>
            {item.isDefault && <Text style={styles.defaultTag}>Default</Text>}
            <TouchableOpacity
              onPress={() => confirmDelete(item.id, item.name)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialCommunityIcons name="trash-can-outline" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity
        style={[styles.addButton, { bottom: bottomOffset }]}
        onPress={() => navigation.navigate("CategoryForm", undefined)}
        activeOpacity={0.85}
      >
        <MaterialCommunityIcons name="plus" size={20} color={colors.background} />
        <Text style={styles.addButtonText}>Add custom category</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.lg, paddingBottom: 100 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  label: { ...typography.body, flex: 1 },
  defaultTag: { ...typography.small, backgroundColor: colors.surfaceRaised, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 999 },
  addButton: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
    height: 50,
    borderRadius: 12,
    backgroundColor: colors.accent,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  addButtonText: { color: colors.background, fontWeight: "700", fontSize: 15 },
});
