import React, { useState, useEffect, useRef } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View, Animated, Easing, LayoutAnimation, Dimensions } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
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
import { Category } from "../../types/models";

const SCREEN_WIDTH = Dimensions.get("window").width;

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function CategoriesScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<RootStackParamList, "Categories">>();
  const highlightId = route.params?.highlightId;
  const deleteId = route.params?.deleteId;
  
  const insets = useSafeAreaInsets();
  const { data: categories, isLoading, removeCategory } = useCategories();
  const { confirm, alert } = useDialog();

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [highlightingId, setHighlightingId] = useState<string | null>(null);

  useEffect(() => {
    if (deleteId && deleteId !== deletingId) {
      setDeletingId(deleteId);
      navigation.setParams({ deleteId: undefined });
    }
  }, [deleteId, deletingId, navigation]);

  useEffect(() => {
    if (highlightId) {
      setHighlightingId(highlightId);
      navigation.setParams({ highlightId: undefined });
      setTimeout(() => {
        setHighlightingId(null);
      }, 3000);
    }
  }, [highlightId, navigation]);

  const confirmDelete = (item: Category) => {
    if ((categories?.length || 0) <= 5) {
      alert({
        title: "Minimum categories reached",
        message: "You must have at least 5 categories. Add a new one before deleting this one.",
        icon: "alert-circle-outline",
      });
      return;
    }

    confirm({
      title: `Delete "${item.name}"?`,
      message: 'Any expenses in this category will move to "Other" — nothing gets lost.',
      confirmText: "Delete",
      destructive: true,
      icon: "trash-can-outline",
      onConfirm: () => {
        setDeletingId(item.id);
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
          <CategoryItem
            item={item}
            isNewlyAdded={item.id === highlightingId}
            isDeleting={item.id === deletingId}
            onPress={() => {
              const isImmutable = item.name === "Other";
              if (!isImmutable) navigation.navigate("CategoryForm", { category: item });
            }}
            onDelete={() => confirmDelete(item)}
            onDeleteAnimFinish={async () => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              try {
                await removeCategory(item.id);
              } catch (err: any) {
                alert({
                  title: "Couldn't delete category",
                  message: getErrorMessage(err),
                  icon: "alert-circle-outline",
                });
              }
              setDeletingId(null);
            }}
          />
        )}
      />

      <TouchableOpacity
        style={[
          styles.addButton,
          { bottom: bottomOffset },
          (categories?.length || 0) >= 20 && { backgroundColor: colors.surfaceRaised, borderColor: colors.border, borderWidth: 1 }
        ]}
        onPress={() => {
          if ((categories?.length || 0) >= 20) {
            alert({
              title: "Category limit reached",
              message: "You can only have up to 20 categories to keep your budget manageable.",
              icon: "alert-circle-outline",
            });
            return;
          }
          navigation.navigate("CategoryForm", undefined);
        }}
        activeOpacity={0.85}
      >
        <MaterialCommunityIcons 
          name="plus" 
          size={20} 
          color={(categories?.length || 0) >= 20 ? colors.textMuted : colors.background} 
        />
        <Text style={[
          styles.addButtonText,
          (categories?.length || 0) >= 20 && { color: colors.textMuted }
        ]}>
          Add custom category
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function CategoryItem({
  item,
  isNewlyAdded,
  isDeleting,
  onPress,
  onDelete,
  onDeleteAnimFinish,
}: {
  item: Category;
  isNewlyAdded?: boolean;
  isDeleting?: boolean;
  onPress: () => void;
  onDelete: () => void;
  onDeleteAnimFinish?: () => void;
}) {
  const highlightAnim = useRef(new Animated.Value(isNewlyAdded ? 1 : 0)).current;
  const deleteAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isNewlyAdded) {
      Animated.sequence([
        Animated.timing(highlightAnim, { toValue: 1, duration: 0, useNativeDriver: false }),
        Animated.timing(highlightAnim, { toValue: 0, duration: 2000, delay: 500, useNativeDriver: false })
      ]).start();
    }
  }, [isNewlyAdded]);

  useEffect(() => {
    if (isDeleting) {
      Animated.sequence([
        Animated.timing(deleteAnim, {
          toValue: 1,
          duration: 350,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        })
      ]).start(() => {
        if (onDeleteAnimFinish) onDeleteAnimFinish();
      });
    }
  }, [isDeleting]);

  const isImmutable = item.name === "Other";

  return (
    <View style={{ marginBottom: 0, backgroundColor: isDeleting ? colors.danger : "transparent", overflow: "hidden", justifyContent: "center" }}>
      {isDeleting && (
        <View style={{ position: "absolute", right: 24, alignItems: "center", justifyContent: "center" }}>
          <MaterialCommunityIcons name="trash-can-outline" size={26} color="#FFFFFF" />
        </View>
      )}
      
      <Animated.View style={{
        transform: [{
          translateX: deleteAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, -SCREEN_WIDTH]
          })
        }]
      }}>
        <Animated.View style={[
          styles.row, 
          isImmutable && { opacity: 0.5 },
          { 
            backgroundColor: highlightAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [colors.background, colors.surfaceRaised]
            }) 
          }
        ]}>
          <TouchableOpacity 
            style={styles.innerRow} 
            onPress={onPress}
            activeOpacity={isImmutable ? 1 : 0.7}
            disabled={isImmutable}
          >
            <CategoryPill icon={item.icon} color={item.color} />
            <Text style={styles.label}>{item.name}</Text>
            {item.isDefault && <Text style={styles.defaultTag}>Default</Text>}
            
            {!isImmutable && (
              <TouchableOpacity
                onPress={onDelete}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialCommunityIcons name="trash-can-outline" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            )}
            {isImmutable && (
              <MaterialCommunityIcons name="lock-outline" size={18} color={colors.textMuted} />
            )}
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.lg, paddingBottom: 100 },
  row: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  innerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
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
