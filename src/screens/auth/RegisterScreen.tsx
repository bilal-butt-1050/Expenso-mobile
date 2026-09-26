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
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { AuthStackParamList } from "../../types/navigation";
import { useAuth } from "../../context/AuthContext";
import { getErrorMessage } from "../../api/client";
import { ScreenContainer } from "../../components/ScreenContainer";
import { TextField } from "../../components/TextField";
import { Button } from "../../components/Button";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { SignupCodeStep } from "./SignupCodeStep";

/** A code this recent for the same email is reused instead of sending another (DESIGN §S8). */
const CODE_REUSE_MS = 10 * 60 * 1000;

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
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    try {
      GoogleSignin.configure({
        webClientId:
          "166423632403-eah00rst0smqrkre0phm0i2s5uripqe6.apps.googleusercontent.com",
        offlineAccess: true,
      });
    } catch (e) {
      console.warn(
        "GoogleSignin is not supported in Expo Go. Please use a development build.",
      );
    }
  }, []);

  useEffect(() => {
    if (step !== "code") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      setStep("details");
      return true;
    });
    return () => sub.remove();
  }, [step]);

  const normalizedEmail = email.trim().toLowerCase();

  /** Step 1: check the details, send a code, move on. The account is only created at step 2. */
  const handleContinue = async () => {
    setError(null);

    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    if (!email.trim()) {
      setError("Email is required");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

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
      await GoogleSignin.hasPlayServices();
      try {
        await GoogleSignin.signOut();
      } catch (e) {
        // Ignore errors if already signed out
      }
      const userInfo = await GoogleSignin.signIn();
      if (userInfo.data?.idToken) {
        await loginWithGoogle(userInfo.data.idToken);
      }
    } catch (err: any) {
      if (err.code !== "SIGN_IN_CANCELLED") {
        setError(getErrorMessage(err));
      }
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
            label="Full Name"
            value={name}
            onChangeText={setName}
            placeholder="Bilal Khan"
            autoCapitalize="words"
          />

          <TextField
            label="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
          />

          <TextField
            label="Password"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
            placeholder="At least 8 characters"
            rightElement={
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={8}
              >
                <MaterialCommunityIcons
                  name={showPassword ? "eye-off" : "eye"}
                  size={22}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
            }
          />

          <TextField
            label="Confirm Password"
            secureTextEntry={!showPassword}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Repeat password"
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button
            label="Continue"
            onPress={handleContinue}
            loading={isLoading}
            disabled={
              !email || password.length < 8 || !confirmPassword || !name.trim()
            }
          />

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.googleBtn}
            onPress={handleGoogleSignIn}
            disabled={isLoading}
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

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <TouchableOpacity onPress={() => navigation.navigate("Login")}>
              <Text style={styles.link}> Log in</Text>
            </TouchableOpacity>
          </View>
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
  error: { color: colors.danger, marginBottom: spacing.md, fontSize: 13 },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: spacing.xl,
    paddingBottom: spacing.xxl,
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
    paddingVertical: 14,
    borderRadius: 12,
  },
  googleBtnText: {
    ...typography.body,
    fontWeight: "600",
    color: colors.textPrimary,
  },
});
