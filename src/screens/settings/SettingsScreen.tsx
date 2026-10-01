import React, { useState } from "react";
import { iconName } from "../../utils/icons";
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { check, nameSchema } from "../../utils/validation";
import md5 from "md5";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import { useDialog } from "../../context/DialogContext";
import { ScreenContainer } from "../../components/ScreenContainer";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { BottomSheet } from "../../components/BottomSheet";
import { TextField } from "../../components/TextField";
import { PasswordSheet } from "../../components/PasswordSheet";
import { getErrorMessage } from "../../api/client";
import { colors } from "../../theme/colors";
import { spacing, radius } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { RootStackParamList } from "../../types/navigation";
import { describeLastUpdated } from "../../services/updateService";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function SettingsScreen() {
  const navigation = useNavigation<Nav>();
  // A root stack screen, so there is no tab bar underneath — safe-area inset is the right clearance.
  const insets = useSafeAreaInsets();
  const { user, logout, updateProfile } = useAuth();
  const { confirm, alert } = useDialog();

  const [isEditNameOpen, setIsEditNameOpen] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  // A fresh sheet per opening, so a half-typed password never survives a close (§8.2).
  const [passwordSheetKey, setPasswordSheetKey] = useState(0);

  // The avatar used to fall back to the phone's Google session and then *save* it to this account,
  // so whoever last used Google sign-in on the phone had their photo copied onto every other
  // account opened here. The server sets Google accounts' pictures itself at sign-in.
  const [imageError, setImageError] = useState(false);

  const handleSaveName = async () => {
    setNameError(null);
    const problem = check(nameSchema, nameInput);
    if (problem) {
      setNameError(problem);
      return;
    }
    setIsSavingName(true);
    try {
      await updateProfile({ name: nameInput.trim() });
      setIsEditNameOpen(false);
    } catch (error) {
      setNameError(getErrorMessage(error));
    } finally {
      setIsSavingName(false);
    }
  };

  const confirmLogout = () => {
    confirm({
      title: "Sign out?",
      message: "Are you sure you want to sign out of your account?",
      confirmText: "Sign out",
      destructive: true,
      icon: "logout",
      onConfirm: logout,
    });
  };

  // Fixed for the life of the process: a reload is what changes the running bundle.
  const [lastUpdated] = useState(describeLastUpdated);

  const email = user?.email || "";
  const nameFromEmail = email
    .split("@")[0]
    .replace(/[._]/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
  const displayName = user?.name || nameFromEmail || "Expenso User";
  const emailHash = md5(email.trim().toLowerCase());
  const fallbackAvatarUrl = `https://www.gravatar.com/avatar/${emailHash}?d=identicon&s=150`;
  const avatarUrl = user?.avatarUrl || fallbackAvatarUrl;

  return (
    <ScreenContainer>
      <ScrollView
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.xl }}
      >
        <Card style={styles.profileCard}>
          <View style={styles.avatar}>
            {avatarUrl && !imageError ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} onError={() => setImageError(true)} />
            ) : (
              <Text style={styles.avatarFallbackText}>{(displayName || "E")[0].toUpperCase()}</Text>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{displayName}</Text>
            <Text style={styles.email}>{email}</Text>
          </View>
        </Card>

        <Text style={styles.sectionTitle}>Account</Text>
        <SettingsRow
          icon="account-edit-outline"
          label="Edit profile"
          subtitle="Change your display name"
          onPress={() => {
            setNameInput(displayName);
            setNameError(null);
            setIsEditNameOpen(true);
          }}
        />
        {/* Hidden until the server says which kind of account this is (older servers don't). */}
        {user?.hasPassword !== undefined ? (
          <SettingsRow
            icon="lock-reset"
            label={user.hasPassword ? "Change password" : "Set a password"}
            subtitle={user.hasPassword ? "Update your account password" : "Also sign in with your email"}
            onPress={() => {
              setPasswordSheetKey((k) => k + 1);
              setIsPasswordOpen(true);
            }}
          />
        ) : null}

        <Text style={styles.sectionTitle}>App & system</Text>
        <SettingsRow
          icon="compass-outline"
          label="App tour"
          subtitle="Replay the welcome feature tour"
          onPress={() => navigation.navigate("OnboardingTour", { fromSettings: true })}
        />

        <Button label="Sign out" variant="danger" onPress={confirmLogout} style={styles.logout} />

        {lastUpdated ? <Text style={styles.buildFooter}>{lastUpdated}</Text> : null}
      </ScrollView>

      <BottomSheet visible={isEditNameOpen} onClose={() => setIsEditNameOpen(false)}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Edit profile</Text>
          <TextField
            label="Display name"
            value={nameInput}
            onChangeText={setNameInput}
            placeholder="Your name"
            autoCapitalize="words"
            error={nameError}
          />
          <View style={styles.modalActions}>
            <Button label="Cancel" variant="secondary" onPress={() => setIsEditNameOpen(false)} style={{ flex: 1 }} />
            <Button
              label="Save"
              onPress={handleSaveName}
              loading={isSavingName}
              disabled={nameInput.trim() === displayName.trim() || !nameInput.trim()}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </BottomSheet>

      <PasswordSheet
        key={passwordSheetKey}
        visible={isPasswordOpen}
        hasPassword={user?.hasPassword ?? true}
        onClose={() => setIsPasswordOpen(false)}
        onDone={() => {
          const wasSet = !user?.hasPassword;
          setIsPasswordOpen(false);
          alert({
            title: wasSet ? "Password set" : "Password updated",
            message: wasSet
              ? "You can now also sign in with your email and this password. Other devices were signed out."
              : "Other devices were signed out. This one stays signed in.",
            icon: "check-circle-outline",
          });
        }}
      />
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
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={subtitle}
    >
      <Card style={styles.row}>
        <View style={styles.rowIcon}>
          <MaterialCommunityIcons name={iconName(icon)} size={20} color={colors.accent} />
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
  profileCard: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: spacing.md },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.accentMuted,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: { width: "100%", height: "100%" },
  avatarFallbackText: { ...typography.subtitle, fontWeight: "700", color: colors.accent },
  name: { ...typography.body, fontWeight: "700" },
  email: { ...typography.caption },
  sectionTitle: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: spacing.xl,
    marginBottom: spacing.xs,
    marginLeft: spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: spacing.sm },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.accentMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: { ...typography.body, fontWeight: "600" },
  rowSubtitle: { ...typography.caption, color: colors.textSecondary },
  logout: { marginTop: spacing.xl },
  buildFooter: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: spacing.xl,
    textAlign: "center",
  },
  // No padding of its own: BottomSheet already insets its content, like every other sheet (P15).
  modalContent: { gap: spacing.md },
  modalTitle: { ...typography.subtitle, color: colors.textPrimary, fontWeight: "700" },
  modalActions: { flexDirection: "row", gap: spacing.md, marginTop: spacing.md },
  errorText: { ...typography.caption, color: colors.danger, marginBottom: -spacing.sm },
});
