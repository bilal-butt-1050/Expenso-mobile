import React, { useEffect, useState } from "react";
import { iconName } from "../../utils/icons";
import { Image, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
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
import { spacing, radius, size } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { RootStackParamList } from "../../types/navigation";
import { describeLastUpdated } from "../../services/updateService";
import { AppearancePref, getAppearancePref, setAppearancePref } from "../../theme/appearance";
import { getHapticsEnabled, getSoundsEnabled, hapticLight, setHapticsEnabled, setSoundsEnabled } from "../../utils/haptics";
import { canUseAppLock, isAppLockEnabled, setAppLockEnabled, unlock } from "../../lib/appLock";

const APPEARANCES: { value: AppearancePref; label: string }[] = [
  { value: "system", label: "Same as phone" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];
/** The currencies the server accepts (auth.routes `SUPPORTED_CURRENCIES`). */
const CURRENCIES = ["PKR", "USD", "EUR", "GBP", "AED", "SAR", "INR", "CAD", "AUD"];

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function SettingsScreen() {
  const navigation = useNavigation<Nav>();
  // A root stack screen, so there is no tab bar underneath — safe-area inset is the right clearance.
  const insets = useSafeAreaInsets();
  const { user, logout, updateProfile, deleteAccount } = useAuth();
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

  // Preferences. Read once; each switch saves as it changes.
  const [appearance, setAppearance] = useState(getAppearancePref);
  // Which list the sheet shows stays put while it slides away (G4 m9); `sheetOpen` drives it.
  const [sheet, setSheetKind] = useState<"appearance" | "currency">("appearance");
  const [sheetOpen, setSheetOpen] = useState(false);
  const setSheet = (kind: "appearance" | "currency" | null) => {
    if (kind) setSheetKind(kind);
    setSheetOpen(kind !== null);
  };
  const [deleting, setDeleting] = useState(false);
  const [sounds, setSounds] = useState(getSoundsEnabled);
  const [haptics, setHaptics] = useState(getHapticsEnabled);
  const [appLock, setAppLock] = useState(isAppLockEnabled);
  // null while unknown; false on a phone with no screen lock to ask for.
  const [lockAvailable, setLockAvailable] = useState<boolean | null>(null);
  useEffect(() => {
    let cancelled = false;
    canUseAppLock().then((ok) => {
      if (!cancelled) setLockAvailable(ok);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleAppLock = async (on: boolean) => {
    // Turning it on proves the person can unlock first, so they can't lock themselves out.
    if (on && !(await unlock("Turn on App lock"))) return;
    setAppLockEnabled(on);
    setAppLock(isAppLockEnabled());
  };

  const chooseCurrency = async (currency: string) => {
    setSheet(null);
    if (currency === user?.currency) return;
    try {
      await updateProfile({ currency });
    } catch (error) {
      alert({ title: "Couldn't change currency", message: getErrorMessage(error), icon: "alert-circle-outline" });
    }
  };

  const confirmDelete = () => {
    confirm({
      title: "Delete your account?",
      message:
        "This permanently deletes your account and everything in it: expenses, income, loans, budgets and categories. It can't be undone.",
      confirmText: "Delete account",
      destructive: true,
      icon: "trash-can-outline",
      onConfirm: async () => {
        // With App lock on, deleting needs the same check as opening the app (G4 m13).
        if (isAppLockEnabled() && !(await unlock("Delete your account"))) return;
        setDeleting(true);
        try {
          await deleteAccount();
        } catch (error) {
          setDeleting(false);
          alert({ title: "Couldn't delete your account", message: getErrorMessage(error), icon: "alert-circle-outline" });
        }
      },
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

        <Text style={styles.sectionTitle}>Preferences</Text>
        <SettingsRow
          icon="theme-light-dark"
          label="Appearance"
          subtitle={APPEARANCES.find((a) => a.value === appearance)?.label ?? "Same as phone"}
          onPress={() => setSheet("appearance")}
        />
        <SettingsRow
          icon="cash-multiple"
          label="Currency"
          subtitle={user?.currency ?? "PKR"}
          onPress={() => setSheet("currency")}
        />
        <SwitchRow
          icon="volume-high"
          label="Sounds"
          subtitle="When you add, change or delete entries"
          value={sounds}
          onChange={(v) => {
            setSoundsEnabled(v);
            setSounds(v);
          }}
        />
        <SwitchRow
          icon="vibrate"
          label="Vibration"
          subtitle="A light tap on taps and saves"
          value={haptics}
          onChange={(v) => {
            setHapticsEnabled(v);
            setHaptics(v);
            if (v) hapticLight();
          }}
        />

        <Text style={styles.sectionTitle}>Security</Text>
        <SwitchRow
          icon="fingerprint"
          label="App lock"
          subtitle={
            lockAvailable === false
              ? "Set a screen lock in your phone's settings first"
              : "Ask for your fingerprint, face or screen lock"
          }
          value={appLock}
          disabled={lockAvailable !== true}
          onChange={(v) => void toggleAppLock(v)}
        />

        <Text style={styles.sectionTitle}>App</Text>
        <SettingsRow
          icon="compass-outline"
          label="App tour"
          subtitle="Replay the welcome feature tour"
          onPress={() => navigation.navigate("OnboardingTour", { fromSettings: true })}
        />

        <Button label="Sign out" variant="danger" onPress={confirmLogout} style={styles.logout} />
        <TouchableOpacity
          onPress={confirmDelete}
          disabled={deleting}
          style={styles.deleteAccount}
          accessibilityRole="button"
          accessibilityLabel="Delete account"
          accessibilityState={{ disabled: deleting, busy: deleting }}
        >
          <Text style={styles.deleteAccountText}>{deleting ? "Deleting your account…" : "Delete account"}</Text>
        </TouchableOpacity>

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

      <BottomSheet visible={sheetOpen} onClose={() => setSheet(null)}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{sheet === "currency" ? "Currency" : "Appearance"}</Text>
          {(sheet === "currency"
            ? CURRENCIES.map((c) => ({ value: c, label: c }))
            : APPEARANCES
          ).map((option) => {
            const selected = sheet === "currency" ? option.value === user?.currency : option.value === appearance;
            return (
              <TouchableOpacity
                key={option.value}
                style={[styles.option, selected && styles.optionSelected]}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                onPress={() => {
                  if (sheet === "currency") void chooseCurrency(option.value);
                  else {
                    setSheet(null);
                    setAppearance(option.value as AppearancePref);
                    // Restarts the app when the colours change (theme/appearance.ts).
                    void setAppearancePref(option.value as AppearancePref);
                  }
                }}
              >
                <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>{option.label}</Text>
                {selected ? <MaterialCommunityIcons name="check" size={20} color={colors.accent} /> : null}
              </TouchableOpacity>
            );
          })}
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

function SwitchRow({
  icon,
  label,
  subtitle,
  value,
  disabled,
  onChange,
}: {
  icon: string;
  label: string;
  subtitle: string;
  value: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <Card style={[styles.row, disabled && styles.rowDisabled]}>
      <View style={styles.rowIcon}>
        <MaterialCommunityIcons name={iconName(icon)} size={20} color={colors.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowSubtitle}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        disabled={disabled}
        onValueChange={onChange}
        trackColor={{ false: colors.border, true: colors.accentFill }}
        thumbColor={colors.accentForeground}
        accessibilityLabel={label}
        accessibilityHint={subtitle}
      />
    </Card>
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
  rowDisabled: { opacity: 0.6 },
  deleteAccount: { alignSelf: "center", minHeight: size.minTouch, justifyContent: "center", marginTop: spacing.sm },
  deleteAccountText: { ...typography.small, color: colors.danger },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: size.minTouch,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "transparent",
  },
  optionSelected: { backgroundColor: colors.accentMuted, borderColor: colors.accent },
  optionLabel: { ...typography.body, color: colors.textPrimary },
  optionLabelSelected: { fontWeight: "700" },
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
