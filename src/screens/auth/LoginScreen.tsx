import React, { useState, useEffect } from "react";
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { useAuth } from "../../context/AuthContext";
import { getErrorMessage } from "../../api/client";
import { ScreenContainer } from "../../components/ScreenContainer";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

export function LoginScreen() {
  const { loginWithGoogle } = useAuth();
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

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      try {
        // Sign out first to ensure the account chooser is shown every time
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
      <View style={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.wordmark}>expenso</Text>
          <Text style={styles.tagline}>Know where every rupee goes.</Text>
        </View>

        <View style={styles.bottomSection}>
          {error ? (
            <View style={styles.errorContainer}>
              <MaterialCommunityIcons name="alert-circle-outline" size={18} color={colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={styles.googleBtn}
            onPress={handleGoogleSignIn}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.textPrimary} />
            ) : (
              <>
                <MaterialCommunityIcons name="google" size={20} color={colors.textPrimary} />
                <Text style={styles.googleBtnText}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.disclaimer}>
            By continuing, you agree to our Terms & Privacy Policy.
          </Text>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: "space-between",
    paddingBottom: spacing.xl,
  },
  hero: {
    alignItems: "center",
    marginTop: spacing.xxl * 2,
  },
  wordmark: {
    ...typography.display,
    fontSize: 42,
    color: colors.accent,
    letterSpacing: -1,
  },
  tagline: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  bottomSection: {
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
  disclaimer: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.md,
  },
});
