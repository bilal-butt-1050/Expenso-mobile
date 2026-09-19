import React, { useState, useEffect } from "react";
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator } from "react-native";
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

type Props = NativeStackScreenProps<AuthStackParamList, "Register">;

export function RegisterScreen({ navigation }: Props) {
  const { register, loginWithGoogle } = useAuth();
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
        webClientId: "166423632403-eah00rst0smqrkre0phm0i2s5uripqe6.apps.googleusercontent.com",
        offlineAccess: true,
      });
    } catch (e) {
      console.warn("GoogleSignin is not supported in Expo Go. Please use a development build.");
    }
  }, []);

  const handleRegister = async () => {
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

    setIsLoading(true);
    try {
      await register(email.trim(), password, name.trim());
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
      <View style={styles.header}>
        <Text style={styles.title}>Create your account</Text>
        <Text style={styles.subtitle}>Start tracking your expenses with ease</Text>
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
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
            <MaterialCommunityIcons name={showPassword ? "eye-off" : "eye"} size={22} color={colors.textMuted} />
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
        label="Create Account"
        onPress={handleRegister}
        loading={isLoading}
        disabled={!email || password.length < 8 || !confirmPassword || !name.trim()}
      />

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>OR</Text>
        <View style={styles.dividerLine} />
      </View>

      <TouchableOpacity style={styles.googleBtn} onPress={handleGoogleSignIn} disabled={isLoading}>
        {isLoading ? (
          <ActivityIndicator size="small" color={colors.textPrimary} />
        ) : (
          <MaterialCommunityIcons name="google" size={20} color={colors.textPrimary} />
        )}
        <Text style={styles.googleBtnText}>Continue with Google</Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Already have an account?</Text>
        <TouchableOpacity onPress={() => navigation.navigate("Login")}>
          <Text style={styles.link}> Log in</Text>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: spacing.xl, marginBottom: spacing.xl },
  title: { ...typography.title },
  subtitle: { ...typography.caption, marginTop: spacing.xs },
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
