import React, { useState } from "react";
import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import { useDialog } from "../../context/DialogContext";
import { ScreenContainer } from "../../components/ScreenContainer";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { RootStackParamList } from "../../types/navigation";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function SettingsScreen() {
  const navigation = useNavigation<Nav>();
  const { user, logout, updateProfile } = useAuth();
  const { confirm, showToast } = useDialog();

  const [isSavingsModalOpen, setIsSavingsModalOpen] = useState(false);
  const [savingsInput, setSavingsInput] = useState(String(user?.savingsGoal ?? 20));
  const [isSaving, setIsSaving] = useState(false);

  const confirmLogout = () => {
    confirm({
      title: "Log out?",
      message: "Are you sure you want to log out of your account?",
      confirmText: "Log Out",
      destructive: true,
      icon: "logout",
      onConfirm: logout,
    });
  };

  const handleSaveGoal = async (val: number) => {
    setIsSaving(true);
    try {
      await updateProfile({ savingsGoal: val });
      showToast({ message: `Savings target set to ${val}%`, type: "success" });
      setIsSavingsModalOpen(false);
    } catch {
      showToast({ message: "Failed to update savings target", type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <Card style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(user?.name || user?.email || "?")[0].toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{user?.name || "Expenso user"}</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>
      </Card>

      <SettingsRow
        icon="shape-outline"
        label="Categories"
        subtitle="Add, edit or remove spending categories"
        onPress={() => navigation.navigate("Categories")}
      />
      <SettingsRow
        icon="cash-multiple"
        label="Income"
        subtitle="Log salary, bonus and other income"
        onPress={() => navigation.navigate("Income")}
      />
      <SettingsRow
        icon="piggy-bank-outline"
        label="Savings Target Goal"
        subtitle={
          user?.savingsGoal && user.savingsGoal > 0
            ? `Target: ${user.savingsGoal}% of monthly income`
            : "Set a monthly savings percentage goal"
        }
        onPress={() => {
          setSavingsInput(String(user?.savingsGoal || 20));
          setIsSavingsModalOpen(true);
        }}
      />

      <TouchableOpacity style={styles.logout} onPress={confirmLogout}>
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>

      {/* Savings Goal Bottom Sheet Modal */}
      <Modal
        visible={isSavingsModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsSavingsModalOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setIsSavingsModalOpen(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalSheet}>
            <View style={styles.modalDragHandle} />
            <Text style={styles.modalTitle}>Monthly Savings Target</Text>
            <Text style={styles.modalSubtitle}>
              Set what percentage of your monthly income you aim to save. The dashboard will track your live pace against this goal.
            </Text>

            {/* Quick Presets */}
            <View style={styles.presetRow}>
              {[15, 20, 25, 30, 40, 50].map((pct) => (
                <TouchableOpacity
                  key={pct}
                  style={[
                    styles.presetPill,
                    Number(savingsInput) === pct && styles.presetPillActive,
                  ]}
                  onPress={() => setSavingsInput(String(pct))}
                >
                  <Text
                    style={[
                      styles.presetText,
                      Number(savingsInput) === pct && styles.presetTextActive,
                    ]}
                  >
                    {pct}%
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.inputWrap}>
              <Text style={styles.inputPrefix}>Target %</Text>
              <TextInput
                value={savingsInput}
                onChangeText={setSavingsInput}
                keyboardType="numeric"
                style={styles.numericInput}
                placeholder="20"
                placeholderTextColor={colors.textMuted}
                maxLength={3}
              />
            </View>

            <View style={styles.modalActions}>
              <Button
                label="Cancel"
                variant="secondary"
                onPress={() => setIsSavingsModalOpen(false)}
                style={{ flex: 1 }}
              />
              <Button
                label="Save Target"
                onPress={() => handleSaveGoal(Math.max(0, Math.min(100, Number(savingsInput) || 0)))}
                loading={isSaving}
                style={{ flex: 1 }}
              />
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </ScreenContainer>
  );
}

function SettingsRow({
  icon,
  label,
  subtitle,
  onPress,
}: {
  icon: string;
  label: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress}>
      <Card style={styles.row}>
        <View style={styles.rowIcon}>
          <MaterialCommunityIcons name={icon as any} size={20} color={colors.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowLabel}>{label}</Text>
          <Text style={styles.rowSubtitle}>{subtitle}</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textMuted} />
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: spacing.lg + 4,
    marginBottom: spacing.xs,
  },
  title: { ...typography.title, fontSize: 24, letterSpacing: -0.3 },
  profileCard: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: spacing.md },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.accentMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: colors.accent, fontWeight: "700", fontSize: 18 },
  name: { ...typography.body, fontWeight: "700" },
  email: { ...typography.caption, marginTop: 2 },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: spacing.md },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.accentMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: { ...typography.body, fontWeight: "600" },
  rowSubtitle: { ...typography.small, marginTop: 2 },
  logout: { marginTop: spacing.xl, alignItems: "center", paddingVertical: spacing.md },
  logoutText: { color: colors.danger, fontWeight: "700", fontSize: 15 },

  // Savings Goal Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: colors.surfaceRaised,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  modalDragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignSelf: "center",
    marginBottom: spacing.xs,
  },
  modalTitle: { ...typography.subtitle, fontSize: 18, fontWeight: "700", color: colors.textPrimary },
  modalSubtitle: { ...typography.caption, color: colors.textSecondary, lineHeight: 18 },
  presetRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs + 2,
    marginTop: spacing.xs,
  },
  presetPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  presetPillActive: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.accent,
  },
  presetText: {
    ...typography.caption,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  presetTextActive: {
    color: colors.accent,
    fontWeight: "700",
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 52,
    marginTop: spacing.xs,
  },
  inputPrefix: {
    ...typography.body,
    fontWeight: "600",
    color: colors.textSecondary,
    marginRight: spacing.sm,
  },
  numericInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "700",
  },
  modalActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
});
