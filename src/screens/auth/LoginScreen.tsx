import React, { useEffect, useState } from "react";
import {
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
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { check, emailSchema, nameSchema } from "../../utils/validation";
import { getFreshGoogleIdToken } from "../../services/googleSignIn";
import { useAuth } from "../../context/AuthContext";
import { getErrorMessage } from "../../api/client";
import { ScreenContainer } from "../../components/ScreenContainer";
import { TextField } from "../../components/TextField";
import { Button } from "../../components/Button";
import { SignupCodeStep } from "./SignupCodeStep";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

/** A code sent to the same address within its 10-minute life is reused rather than resent. */
const CODE_REUSE_MS = 10 * 60 * 1000;

/**
 * Sign in or create an account without a password (D-66): an email, the 6-digit code sent to it,
 * and, for a new account only, a name. Google is the other way in. One screen, three steps; going
 * back keeps what was typed.
 */
export function LoginScreen() {
  const { startEmailSignIn, verifyEmailCode, completeEmailSignUp, loginWithGoogle } = useAuth();
  const [step, setStep] = useState<"email" | "code" | "name">("email");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [lastSent, setLastSent] = useState<{ email: string; at: number } | null>(null);
  // The per-email daily cap locks "Resend" until the email changes.
  const [dailyLock, setDailyLock] = useState<{ email: string; message: string } | null>(null);
  // Proof of the address, from the code, for a new account: it's created once there's a name.
  const [signupTicket, setSignupTicket] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const normalizedEmail = email.trim().toLowerCase();

  // Hardware back steps back through the flow instead of leaving it.
  useEffect(() => {
    if (step === "email") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      setStep(step === "name" ? "code" : "email");
      return true;
    });
    return () => sub.remove();
  }, [step]);

  const sendCode = async () => {
    setError(null);
    const problem = check(emailSchema, email);
    setFieldError(problem);
    if (problem) return;

    if (lastSent && lastSent.email === normalizedEmail && Date.now() - lastSent.at < CODE_REUSE_MS) {
      Keyboard.dismiss();
      setStep("code");
      return;
    }
    setIsLoading(true);
    try {
      await startEmailSignIn(normalizedEmail);
      setLastSent({ email: normalizedEmail, at: Date.now() });
      Keyboard.dismiss();
      setStep("code");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const resend = async () => {
    await startEmailSignIn(normalizedEmail);
    setLastSent({ email: normalizedEmail, at: Date.now() });
  };

  /** An existing account is signed in here and this screen goes away; a new one needs a name. */
  const verify = async (code: string) => {
    const result = await verifyEmailCode(normalizedEmail, code);
    if (result.status === "new") {
      setSignupTicket(result.signupTicket);
      setStep("name");
    }
  };

  const createAccount = async () => {
    setError(null);
    const problem = check(nameSchema, name);
    setFieldError(problem);
    if (problem || !signupTicket) return;
    setIsLoading(true);
    try {
      await completeEmailSignUp(signupTicket, name.trim());
    } catch (err) {
      setError(getErrorMessage(err));
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsLoading(true);
    try {
      // null: the user closed the account picker.
      const idToken = await getFreshGoogleIdToken();
      if (idToken) await loginWithGoogle(idToken);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const errorBlock = error ? (
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
  ) : null;

  return (
    <ScreenContainer>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          overScrollMode="never"
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step === "code" && lastSent ? (
            <SignupCodeStep
              email={lastSent.email}
              sentAt={lastSent.at}
              dailyLock={dailyLock?.email === lastSent.email ? dailyLock.message : null}
              onVerify={verify}
              onResend={resend}
              onDailyLock={(message) => setDailyLock({ email: lastSent.email, message })}
              onEditEmail={() => setStep("email")}
            />
          ) : step === "name" ? (
            <View style={styles.form}>
              <View style={styles.stepHeader}>
                <Text style={styles.title}>What should we call you?</Text>
                <Text style={styles.subtitle}>Your email is confirmed. Add your name to create your account.</Text>
              </View>
              {errorBlock}
              <TextField
                label="Your name"
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  if (fieldError) setFieldError(null);
                }}
                placeholder="Your full name"
                autoCapitalize="words"
                autoFocus
                maxLength={80}
                error={fieldError}
                returnKeyType="done"
                onSubmitEditing={createAccount}
              />
              <Button label="Create account" onPress={createAccount} loading={isLoading} />
            </View>
          ) : (
            <>
              <View style={styles.hero}>
                <Text style={styles.wordmark}>expenso</Text>
                <Text style={styles.tagline}>Know where every rupee goes.</Text>
              </View>

              <View style={styles.form}>
                {errorBlock}
                <TextField
                  label="Email"
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (fieldError) setFieldError(null);
                  }}
                  placeholder="you@example.com"
                  error={fieldError}
                  returnKeyType="send"
                  onSubmitEditing={sendCode}
                />
                <Text style={styles.hint}>We'll email you a 6-digit code. No password needed.</Text>
                <Button label="Continue with email" onPress={sendCode} loading={isLoading} style={styles.cta} />

                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or</Text>
                  <View style={styles.dividerLine} />
                </View>

                <TouchableOpacity
                  style={styles.googleBtn}
                  onPress={handleGoogleSignIn}
                  disabled={isLoading}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: isLoading }}
                >
                  <MaterialCommunityIcons name="google" size={20} color={colors.textPrimary} />
                  <Text style={styles.googleBtnText}>Continue with Google</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.xl,
  },
  hero: {
    alignItems: "center",
    marginTop: spacing.xl * 1.5,
    marginBottom: spacing.xl,
  },
  wordmark: {
    ...typography.display,
    color: colors.accent,
    letterSpacing: -1,
  },
  tagline: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  form: {
    width: "100%",
  },
  stepHeader: { marginTop: spacing.xl, marginBottom: spacing.lg, gap: spacing.xs },
  title: { ...typography.title },
  subtitle: { ...typography.body, color: colors.textSecondary },
  hint: { ...typography.small, fontWeight: "400", color: colors.textSecondary, marginTop: -spacing.xs },
  cta: { marginTop: spacing.md },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.dangerMuted,
    borderWidth: 1,
    // Over the same tint, this draws a slightly stronger edge.
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
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: spacing.lg,
    gap: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    ...typography.small,
    color: colors.textMuted,
    textTransform: "uppercase",
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
    paddingHorizontal: spacing.md,
  },
  googleBtnText: {
    ...typography.body,
    fontWeight: "700",
    color: colors.textPrimary,
  },
});
