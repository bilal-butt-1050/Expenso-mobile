import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { check, emailSchema, loginPasswordSchema } from "../../utils/validation";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { getFreshGoogleIdToken } from "../../services/googleSignIn";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useAuth } from "../../context/AuthContext";
import { getErrorMessage } from "../../api/client";
import { ScreenContainer } from "../../components/ScreenContainer";
import { TextField } from "../../components/TextField";
import { Button } from "../../components/Button";
import { colors } from "../../theme/colors";
import { radius, size, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { AuthStackParamList } from "../../types/navigation";

type Nav = NativeStackNavigationProp<AuthStackParamList, "Login">;

export function LoginScreen() {
  const navigation = useNavigation<Nav>();
  const { login, loginWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleEmailLogin = async () => {
    setError(null);
    const problem = check(emailSchema, email) ?? check(loginPasswordSchema, password);
    if (problem) {
      setError(problem);
      return;
    }
    setIsLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
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

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <Text style={styles.wordmark}>expenso</Text>
            <Text style={styles.tagline}>Know where every rupee goes.</Text>
          </View>

          <View style={styles.form}>
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
              placeholder="Your password"
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

            <Button
              label="Sign in"
              onPress={handleEmailLogin}
              loading={isLoading}
              style={{ marginTop: spacing.sm }}
            />

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

            <TouchableOpacity
              style={styles.signupLink}
              onPress={() => navigation.navigate("Register")}
              activeOpacity={0.7}
              accessibilityRole="button"
            >
              <Text style={styles.signupText}>
                Don't have an account? <Text style={styles.signupHighlight}>Sign up</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
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
  signupLink: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: size.minTouch,
    marginTop: spacing.xl,
  },
  signupText: {
    ...typography.caption,
    fontWeight: "400",
    color: colors.textSecondary,
  },
  signupHighlight: {
    color: colors.accent,
    fontWeight: "700",
  },
});

