import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useAuth } from "../../context/AuthContext";
import { getErrorMessage } from "../../api/client";
import { ScreenContainer } from "../../components/ScreenContainer";
import { TextField } from "../../components/TextField";
import { Button } from "../../components/Button";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
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

  useEffect(() => {
    try {
      GoogleSignin.configure({
        webClientId: "166423632403-eah00rst0smqrkre0phm0i2s5uripqe6.apps.googleusercontent.com",
        offlineAccess: true,
      });
    } catch (e) {
      console.warn("GoogleSignin is not supported in Expo Go. Please use a development build.");
    }
  }, []);

  const handleEmailLogin = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
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
              <View style={styles.errorContainer}>
                <MaterialCommunityIcons name="alert-circle-outline" size={18} color={colors.danger} />
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
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={10}>
                  <MaterialCommunityIcons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>
              }
            />

            <Button
              label="Sign In"
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
            >
              <MaterialCommunityIcons name="google" size={20} color={colors.textPrimary} />
              <Text style={styles.googleBtnText}>Continue with Google</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.signupLink}
              onPress={() => navigation.navigate("Register")}
              activeOpacity={0.7}
            >
              <Text style={styles.signupText}>
                Don't have an account? <Text style={styles.signupHighlight}>Sign up</Text>
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.disclaimer}>
            By continuing, you agree to our Terms & Privacy Policy.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    justifyContent: "space-between",
    paddingBottom: spacing.xl,
  },
  hero: {
    alignItems: "center",
    marginTop: spacing.xl * 1.5,
    marginBottom: spacing.xl,
  },
  wordmark: {
    ...typography.display,
    fontSize: 40,
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
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.25)",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.caption,
    color: colors.danger,
    fontSize: 13,
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
    fontSize: 13,
    fontWeight: "600",
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
    borderRadius: 14,
    paddingHorizontal: spacing.md,
  },
  googleBtnText: {
    ...typography.body,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  signupLink: {
    alignItems: "center",
    marginTop: spacing.xl,
    paddingVertical: spacing.xs,
  },
  signupText: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  signupHighlight: {
    color: colors.accent,
    fontWeight: "700",
  },
  disclaimer: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.lg,
  },
});

