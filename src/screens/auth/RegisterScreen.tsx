import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { getFreshGoogleIdToken } from "../../services/googleSignIn";
import { AuthStackParamList } from "../../types/navigation";
import { useAuth } from "../../context/AuthContext";
import { getErrorMessage } from "../../api/client";
import { ScreenContainer } from "../../components/ScreenContainer";
import { TextField } from "../../components/TextField";
import { Button } from "../../components/Button";
import { colors } from "../../theme/colors";
import { radius, size, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { SignupCodeStep } from "./SignupCodeStep";

/** A code this recent for the same email is reused instead of sending another (DESIGN §S8). */
const CODE_REUSE_MS = 10 * 60 * 1000;

/** A loose shape check only; the server decides what a valid address is. */
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FieldErrors = Partial<Record<"name" | "email" | "password" | "confirm", string>>;

type Props = NativeStackScreenProps<AuthStackParamList, "Register">;

export function RegisterScreen({ navigation }: Props) {
  const { register, sendOtp, loginWithGoogle } = useAuth();
  // Two steps on one screen: details, then the emailed code. Going back keeps every field.
  const [step, setStep] = useState<"details" | "code">("details");
  const [lastSent, setLastSent] = useState<{
    email: string;
    at: number;
  } | null>(null);
  // The per-email daily cap locks "Resend" until the email changes.
  const [dailyLock, setDailyLock] = useState<{
    email: string;
    message: string;
  } | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  // Per-field problems, shown under each field once Continue is pressed (W10).
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  // Server and Google errors, in the same block as the sign-in screen.
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (step !== "code") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      setStep("details");
      return true;
    });
    return () => sub.remove();
  }, [step]);

  const normalizedEmail = email.trim().toLowerCase();

  const clearFieldError = (field: keyof FieldErrors) =>
    setFieldErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));

  /** Step 1: check the details, send a code, move on. The account is only created at step 2. */
  const handleContinue = async () => {
    setError(null);

    const problems: FieldErrors = {};
    if (!name.trim()) problems.name = "Enter your name";
    if (!email.trim()) problems.email = "Enter your email";
    else if (!EMAIL_SHAPE.test(email.trim())) problems.email = "Enter a valid email";
    if (password.length < 8) problems.password = "Use at least 8 characters";
    if (password !== confirmPassword) problems.confirm = "Passwords don't match";
    setFieldErrors(problems);
    if (Object.keys(problems).length > 0) return;

    // A code sent to this same address in the last 10 minutes is still valid: don't send another
    // (which would also hit the 60 s cooldown).
    if (
      lastSent &&
      lastSent.email === normalizedEmail &&
      Date.now() - lastSent.at < CODE_REUSE_MS
    ) {
      Keyboard.dismiss();
      setStep("code");
      return;
    }

    setIsLoading(true);
    try {
      await sendOtp(normalizedEmail);
      setLastSent({ email: normalizedEmail, at: Date.now() });
      Keyboard.dismiss();
      setStep("code");
    } catch (err) {
      setError(
        getErrorMessage(err) ||
          "We couldn't send the code right now. Try again in a few minutes.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    await sendOtp(normalizedEmail);
    setLastSent({ email: normalizedEmail, at: Date.now() });
  };

  /** Step 2: the code creates the account and signs in; the navigator then leaves this screen. */
  const handleVerify = async (code: string) => {
    await register(normalizedEmail, password, name.trim(), code);
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsLoading(true);
    try {
      // null: the user closed the account picker.
      const idToken = await getFreshGoogleIdToken();
      if (idToken) {
        await loginWithGoogle(idToken);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  if (step === "code" && lastSent) {
    return (
      <ScreenContainer>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
          >
            <SignupCodeStep
              email={lastSent.email}
              sentAt={lastSent.at}
              dailyLock={
                dailyLock?.email === lastSent.email ? dailyLock.message : null
              }
              onVerify={handleVerify}
              onResend={handleResend}
              onDailyLock={(message) =>
                setDailyLock({ email: lastSent.email, message })
              }
              onEditEmail={() => setStep("details")}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.title}>Create your account</Text>
            <Text style={styles.subtitle}>
              Start tracking your expenses with ease
            </Text>
          </View>

          <TextField
            label="Full name"
            value={name}
            onChangeText={(text) => {
              setName(text);
              clearFieldError("name");
            }}
            placeholder="Bilal Khan"
            autoCapitalize="words"
            error={fieldErrors.name}
          />

          <TextField
            label="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              clearFieldError("email");
            }}
            placeholder="you@example.com"
            error={fieldErrors.email}
          />

          <TextField
            label="Password"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              clearFieldError("password");
            }}
            placeholder="At least 8 characters"
            error={fieldErrors.password}
            rightElement={
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? "Hide password" : "Show password"}
              >
                <MaterialCommunityIcons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
            }
          />

          <TextField
            label="Confirm password"
            secureTextEntry={!showPassword}
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text);
              clearFieldError("confirm");
            }}
            placeholder="Repeat password"
            error={fieldErrors.confirm}
          />

          {/* Server and Google errors, next to the button that caused them (G4 m1). */}
          {error ? (
            <View style={styles.errorContainer} accessibilityLiveRegion="polite">
              <MaterialCommunityIcons
                name="alert-circle-outline"
                size={18}
                color={colors.danger}
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Always enabled: pressing it says what's missing, instead of a silent grey button. */}
          <Button label="Continue" onPress={handleContinue} loading={isLoading} />

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.googleBtn}
            onPress={handleGoogleSignIn}
            disabled={isLoading}
            accessibilityRole="button"
            accessibilityState={{ disabled: isLoading, busy: isLoading }}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.textPrimary} />
            ) : (
              <MaterialCommunityIcons
                name="google"
                size={20}
                color={colors.textPrimary}
              />
            )}
            <Text style={styles.googleBtnText}>Continue with Google</Text>
          </TouchableOpacity>

          {/* One row-wide target, as on the sign-in screen (P16). */}
          <TouchableOpacity
            style={styles.footer}
            onPress={() => navigation.navigate("Login")}
            activeOpacity={0.7}
            accessibilityRole="button"
          >
            <Text style={styles.footerText}>
              Already have an account? <Text style={styles.link}>Sign in</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1 },
  header: { marginTop: spacing.xl, marginBottom: spacing.xl },
  title: { ...typography.title },
  subtitle: { ...typography.caption, marginTop: spacing.xs },
  // The sign-in screen's error block (W10).
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.dangerMuted,
    borderWidth: 1,
    borderColor: colors.dangerMuted,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.small,
    fontWeight: "500",
    color: colors.danger,
    flexShrink: 1,
  },
  footer: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: size.minTouch,
    marginTop: spacing.xl,
    marginBottom: spacing.xxl,
  },
  footerText: { ...typography.caption },
  link: { ...typography.caption, color: colors.accentText, fontWeight: "700" },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    ...typography.caption,
    marginHorizontal: spacing.md,
  },
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 54,
    borderRadius: radius.md,
  },
  googleBtnText: {
    ...typography.body,
    fontWeight: "600",
    color: colors.textPrimary,
  },
});
