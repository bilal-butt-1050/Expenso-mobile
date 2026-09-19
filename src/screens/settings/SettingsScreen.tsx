import React, { useState, useEffect } from "react";
import { Image, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import md5 from "md5";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import * as Updates from "expo-updates";
import { useAuth } from "../../context/AuthContext";
import { useDialog } from "../../context/DialogContext";
import { ScreenContainer } from "../../components/ScreenContainer";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { BottomSheet } from "../../components/BottomSheet";
import { TextField } from "../../components/TextField";
import { getErrorMessage } from "../../api/client";
import { colors } from "../../theme/colors";
import { spacing, radius } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { formatCurrency } from "../../utils/currency";
import { RootStackParamList } from "../../types/navigation";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function SettingsScreen() {
  const navigation = useNavigation<Nav>();
  const { user, logout, updateProfile, changePassword } = useAuth();
  const { confirm, alert } = useDialog();

  const [isEditNameOpen, setIsEditNameOpen] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPasswordError, setCurrentPasswordError] = useState<string | null>(null);
  const [newPasswordError, setNewPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);

  const [googlePhoto, setGooglePhoto] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (user?.avatarUrl) return;
    (async () => {
      try {
        const currentUser = await GoogleSignin.getCurrentUser();
        if (currentUser?.user?.photo) {
          setGooglePhoto(currentUser.user.photo);
          updateProfile({ avatarUrl: currentUser.user.photo }).catch(() => {});
        }
      } catch (e) {
        // Ignore if not signed in via Google
      }
    })();
  }, [user?.avatarUrl, updateProfile]);

  const handleSaveName = async () => {
    setNameError(null);
    if (!nameInput.trim()) {
      setNameError("Name cannot be empty");
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

  const handleChangePassword = async () => {
    setCurrentPasswordError(null);
    setNewPasswordError(null);
    setConfirmPasswordError(null);

    let hasError = false;
    if (newPassword.length < 8) {
      setNewPasswordError("New password must be at least 8 characters");
      hasError = true;
    }
    if (newPassword !== confirmNewPassword) {
      setConfirmPasswordError("New passwords do not match");
      hasError = true;
    }
    if (hasError) return;

    setIsChangingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      setIsChangePasswordOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      alert({
        title: "Success",
        message: "Password updated successfully.",
        icon: "check-circle-outline",
      });
    } catch (error) {
      const msg = getErrorMessage(error);
      if (msg.toLowerCase().includes("current password")) {
        setCurrentPasswordError(msg);
      } else {
        setNewPasswordError(msg);
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

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

  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);

  const handleCheckForUpdates = async () => {
    if (__DEV__ || !Updates.isEnabled) {
      alert({
        title: "Development Mode",
        message: "Over-the-air updates are only active in standalone APK/production builds.",
        icon: "information-outline",
      });
      return;
    }

    setIsCheckingUpdate(true);
    try {
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        alert({
          title: "Update Available",
          message: "Downloading the latest version in the background...",
          icon: "download",
        });
        const res = await Updates.fetchUpdateAsync();
        if (res.isNew) {
          confirm({
            title: "Update Downloaded",
            message: "The latest update has been downloaded. Would you like to restart the app to apply it now?",
            confirmText: "Restart Now",
            icon: "restart",
            onConfirm: async () => {
              await Updates.reloadAsync();
            },
          });
        }
      } else {
        alert({
          title: "Up to Date",
          message: "You are running the latest version of Expenso.",
          icon: "check-circle-outline",
        });
      }
    } catch (err) {
      alert({
        title: "Update Check Failed",
        message: "Unable to reach update servers. Please check your internet connection.",
        icon: "alert-circle-outline",
      });
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const email = user?.email || "";
  const nameFromEmail = email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, l => l.toUpperCase());
  const displayName = user?.name || nameFromEmail || "Expenso User";
  const emailHash = md5(email.trim().toLowerCase());
  const fallbackAvatarUrl = `https://www.gravatar.com/avatar/${emailHash}?d=identicon&s=150`;
  const avatarUrl = user?.avatarUrl || googlePhoto || fallbackAvatarUrl;

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <Card style={styles.profileCard}>
        <View style={styles.avatar}>
          {avatarUrl && !imageError ? (
            <Image
              source={{ uri: avatarUrl }}
              style={styles.avatarImage}
              onError={() => setImageError(true)}
            />
          ) : (
            <Text style={styles.avatarFallbackText}>
              {(displayName || "E")[0].toUpperCase()}
            </Text>
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
        label="Edit Profile"
        subtitle="Change your display name"
        onPress={() => {
          setNameInput(displayName);
          setNameError(null);
          setIsEditNameOpen(true);
        }}
      />
      {/* 
      <SettingsRow
        icon="lock-reset"
        label="Change Password"
        subtitle="Update your account password"
        onPress={() => {
          setCurrentPassword("");
          setNewPassword("");
          setConfirmNewPassword("");
          setShowCurrentPassword(false);
          setShowNewPassword(false);
          setShowConfirmPassword(false);
          setCurrentPasswordError(null);
          setNewPasswordError(null);
          setConfirmPasswordError(null);
          setIsChangePasswordOpen(true);
        }}
      />
      */}

      <Text style={styles.sectionTitle}>Preferences</Text>
      <SettingsRow
        icon="shape-outline"
        label="Customize Categories"
        subtitle="Add, edit or remove spending categories"
        onPress={() => navigation.navigate("Categories")}
      />

      <Text style={styles.sectionTitle}>App & System</Text>
      <SettingsRow
        icon="cloud-sync-outline"
        label={isCheckingUpdate ? "Checking for Updates..." : "Check for Updates"}
        subtitle={`Channel: ${Updates.channel || "development"} • v1.0.0`}
        onPress={handleCheckForUpdates}
      />

      <TouchableOpacity style={styles.logout} onPress={confirmLogout}>
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>

      <BottomSheet visible={isEditNameOpen} onClose={() => setIsEditNameOpen(false)}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Edit Profile</Text>
          <TextField
            label="Display Name"
            value={nameInput}
            onChangeText={setNameInput}
            placeholder="e.g. Jane Doe"
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

      {/* 
      <BottomSheet visible={isChangePasswordOpen} onClose={() => setIsChangePasswordOpen(false)}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Change Password</Text>
          <TextField
            label="Current Password"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry={!showCurrentPassword}
            placeholder="Enter current password"
            error={currentPasswordError}
            rightElement={
              <TouchableOpacity onPress={() => setShowCurrentPassword(!showCurrentPassword)} style={{ padding: spacing.xs }}>
                <MaterialCommunityIcons name={showCurrentPassword ? "eye-off" : "eye"} size={22} color={colors.textMuted} />
              </TouchableOpacity>
            }
          />
          <TextField
            label="New Password"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry={!showNewPassword}
            placeholder="Minimum 8 characters"
            error={newPasswordError}
            rightElement={
              <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)} style={{ padding: spacing.xs }}>
                <MaterialCommunityIcons name={showNewPassword ? "eye-off" : "eye"} size={22} color={colors.textMuted} />
              </TouchableOpacity>
            }
          />
          <TextField
            label="Confirm New Password"
            value={confirmNewPassword}
            onChangeText={setConfirmNewPassword}
            secureTextEntry={!showConfirmPassword}
            placeholder="Re-enter new password"
            error={confirmPasswordError}
            rightElement={
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={{ padding: spacing.xs }}>
                <MaterialCommunityIcons name={showConfirmPassword ? "eye-off" : "eye"} size={22} color={colors.textMuted} />
              </TouchableOpacity>
            }
          />
          <View style={styles.modalActions}>
            <Button label="Cancel" variant="secondary" onPress={() => setIsChangePasswordOpen(false)} style={{ flex: 1 }} />
            <Button 
              label="Update" 
              onPress={handleChangePassword} 
              loading={isChangingPassword} 
              disabled={confirmNewPassword.length === 0}
              style={{ flex: 1 }} 
            />
          </View>
        </View>
      </BottomSheet>
      */}
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
    overflow: "hidden",
  },
  avatarImage: { width: "100%", height: "100%" },
  avatarFallbackText: { fontSize: 20, fontWeight: "700", color: colors.accent },
  name: { ...typography.body, fontWeight: "700" },
  email: { ...typography.caption, marginTop: 2 },
  sectionTitle: { ...typography.small, color: colors.textMuted, marginTop: spacing.xl, marginBottom: spacing.xs, marginLeft: spacing.sm, textTransform: "uppercase", letterSpacing: 0.5 },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: spacing.sm },
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
  modalContent: { padding: spacing.xl, gap: spacing.md },
  modalTitle: { ...typography.title, fontSize: 20, marginBottom: spacing.sm },
  modalActions: { flexDirection: "row", gap: spacing.md, marginTop: spacing.md },
  errorText: { color: colors.danger, ...typography.caption, marginBottom: -spacing.sm },
});
