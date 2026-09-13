import React, { useState, useEffect } from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
// import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { AuthStackParamList } from "../../types/navigation";
import { useAuth } from "../../context/AuthContext";
import { getErrorMessage } from "../../api/client";
import { ScreenContainer } from "../../components/ScreenContainer";
import { TextField } from "../../components/TextField";
import { Button } from "../../components/Button";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

export function LoginScreen({ navigation }: Props) {
  const { login, loginWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // GoogleSignin is temporarily disabled to prevent Expo Go crashes.
    // Uncomment when you have a custom dev build.
    /*
    try {
      GoogleSignin.configure({
        webClientId: "166423632403-eah00rst0smqrkre0phm0i2s5uripqe6.apps.googleusercontent.com",
        offlineAccess: true,
      });
    } catch (e) {
      console.warn("GoogleSignin is not supported in Expo Go. Please use a development build.");
    }
    */
  }, []);

  const handleSubmit = async () => {
    setError(null);
    setIsLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("Google Sign-In requires a custom dev build. It is disabled in Expo Go.");
    /*
    setError(null);
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      if (userInfo.data?.idToken) {
        setIsLoading(true);
        await loginWithGoogle(userInfo.data.idToken);
      }
    } catch (err: any) {
      if (err.code !== "SIGN_IN_CANCELLED") {
        setError(getErrorMessage(err));
      }
    } finally {
      setIsLoading(false);
    }
    */
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.wordmark}>expenso</Text>
        <Text style={styles.tagline}>Know where every rupee goes.</Text>
      </View>

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
        placeholder="••••••••"
        rightElement={
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
            <MaterialCommunityIcons name={showPassword ? "eye-off" : "eye"} size={22} color={colors.textMuted} />
          </TouchableOpacity>
        }
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button label="Log In" onPress={handleSubmit} loading={isLoading} disabled={!email || !password} />

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>OR</Text>
        <View style={styles.dividerLine} />
      </View>

      <TouchableOpacity style={styles.googleBtn} onPress={handleGoogleSignIn} disabled={isLoading}>
        <MaterialCommunityIcons name="google" size={20} color={colors.textPrimary} />
        <Text style={styles.googleBtnText}>Continue with Google</Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.footerText}>New to Expenso?</Text>
        <Text style={styles.link} onPress={() => navigation.navigate("Register")}>
          {" "}
          Create an account
        </Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: "center", marginTop: spacing.xxl * 2, marginBottom: spacing.xxl },
  wordmark: { ...typography.display, color: colors.accent, letterSpacing: -1 },
  tagline: { ...typography.caption, marginTop: spacing.xs },
  error: { color: colors.danger, marginBottom: spacing.md, fontSize: 13 },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: spacing.xl, paddingBottom: spacing.xxl },
  footerText: { ...typography.caption },
  link: { ...typography.caption, color: colors.accent, fontWeight: "700" },
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
