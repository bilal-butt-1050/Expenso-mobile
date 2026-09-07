import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCategories } from "../../hooks/useCategories";
import { useDialog } from "../../context/DialogContext";
import { getErrorMessage } from "../../api/client";
import { TextField } from "../../components/TextField";
import { Button } from "../../components/Button";
import { CategoryPill } from "../../components/CategoryPill";
import { ColorPicker, IconPicker } from "../../components/CategoryPickers";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { RootStackParamList } from "../../types/navigation";

type Props = NativeStackScreenProps<RootStackParamList, "CategoryForm">;

export function CategoryFormScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const editing = route.params?.category;
  const { addCategory, editCategory } = useCategories();
  const { showToast } = useDialog();

  const [name, setName] = useState(editing?.name ?? "");
  const [icon, setIcon] = useState(editing?.icon ?? "shape-outline");
  const [color, setColor] = useState(editing?.color ?? colors.categoryPalette[0]);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return setError("Give this category a name");

    setError(null);
    setIsSaving(true);
    try {
      if (editing) {
        await editCategory(editing.id, { name: name.trim(), icon, color });
        showToast({ message: "Category updated", type: "success" });
      } else {
        await addCategory({ name: name.trim(), icon, color });
        showToast({ message: "Category created", type: "success" });
      }
      navigation.goBack();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: Math.max(insets.bottom, 24) + spacing.xxl + 16 },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.preview}>
        <CategoryPill icon={icon} color={color} size={56} />
        <Text style={styles.previewName}>{name || "New category"}</Text>
      </View>

      <TextField label="Name" value={name} onChangeText={setName} placeholder="e.g. Pet Care" maxLength={30} />

      <ColorPicker value={color} onChange={setColor} />
      <IconPicker value={icon} color={color} onChange={setIcon} />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button label={editing ? "Save Changes" : "Create Category"} onPress={handleSave} loading={isSaving} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  preview: { alignItems: "center", gap: spacing.sm, marginBottom: spacing.xl },
  previewName: { ...typography.subtitle, color: colors.textPrimary },
  error: { color: colors.danger, marginBottom: spacing.md, fontSize: 13 },
});
