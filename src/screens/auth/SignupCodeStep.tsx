import React, { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import axios from "axios";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { getErrorMessage } from "../../api/client";
import { Button } from "../../components/Button";
import { colors } from "../../theme/colors";
import { radius, size, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

/** Matches the server's per-email resend cooldown. */
export const RESEND_COOLDOWN_MS = 60_000;

const statusOf = (error: unknown) =>
  axios.isAxiosError(error) ? error.response?.status : undefined;

interface Props {
  email: string;
  /** When the last code was successfully sent; the resend countdown runs from here. */
  sentAt: number;
  /** A server message that locks "Resend" until the email changes (the per-email daily cap). */
  dailyLock: string | null;
  onVerify: (code: string) => Promise<void>;
  onResend: () => Promise<void>;
  onDailyLock: (message: string) => void;
  onEditEmail: () => void;
}

/**
 * Step 2 of signup (DESIGN §S8): enter the 6-digit code that was emailed. One field, so paste and
 * the one-time-code autofill work and a screen reader reads a single input. It submits itself on the
 * sixth digit.
 */
export function SignupCodeStep({
  email,
  sentAt,
  dailyLock,
  onVerify,
  onResend,
  onDailyLock,
  onEditEmail,
}: Props) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  // After 5 wrong codes the code is burned: entry is off until a new one is sent.
  const [codeLocked, setCodeLocked] = useState(false);
  // An expired or missing code makes resend available at once, whatever the countdown says.
  const [cooldownOverridden, setCooldownOverridden] = useState(false);
  // The per-IP send cap: its message replaces the countdown, and resend waits a fresh 60 s.
  const [ipCap, setIpCap] = useState<{ message: string; until: number } | null>(
    null,
  );
  const [now, setNow] = useState(() => Date.now());
  const inputRef = useRef<TextInput>(null);
  const [selection, setSelection] = useState<
    { start: number; end: number } | undefined
  >(undefined);

  const cooldownEndsAt = Math.max(
    sentAt + RESEND_COOLDOWN_MS,
    ipCap?.until ?? 0,
  );
  const remainingMs =
    cooldownOverridden && !ipCap ? 0 : Math.max(0, cooldownEndsAt - now);
  const ticking = remainingMs > 0;
  const canResend = !dailyLock && !resending && !ticking;
  const ipCapMessage = ipCap && now < ipCap.until ? ipCap.message : null;

  // Tick once a second while a countdown is running.
  useEffect(() => {
    if (!ticking) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [ticking]);

  // Announce once when resend becomes available, not every second.
  useEffect(() => {
    if (!ticking && !dailyLock) {
      AccessibilityInfo.announceForAccessibility("You can resend the code now");
    }
  }, [ticking, dailyLock]);

  const submit = async (value: string) => {
    if (value.length !== 6 || submitting || codeLocked) return;
    setError(null);
    setSubmitting(true);
    try {
      await onVerify(value);
      // Success signs the user in and this screen goes away.
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      if (statusOf(err) === 429 && /incorrect/i.test(message)) {
        setCodeLocked(true);
        setCooldownOverridden(true);
      } else if (/expired|Request a verification code first/i.test(message)) {
        setCooldownOverridden(true);
      } else {
        // Wrong code: keep it and select it all, ready to retype.
        setSelection({ start: 0, end: value.length });
        inputRef.current?.focus();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const resend = async () => {
    if (!canResend) return;
    setError(null);
    setResending(true);
    try {
      await onResend();
      setCode("");
      setCodeLocked(false);
      setCooldownOverridden(false);
      setIpCap(null);
      setNow(Date.now());
      AccessibilityInfo.announceForAccessibility("New code sent");
      inputRef.current?.focus();
    } catch (err) {
      const message = getErrorMessage(err);
      if (statusOf(err) === 429 && /tomorrow/i.test(message)) {
        onDailyLock(message);
      } else if (statusOf(err) === 429 && !/Please wait/i.test(message)) {
        // The per-IP cap: show it in place of the countdown, and wait a fresh minute.
        const at = Date.now();
        setIpCap({ message, until: at + RESEND_COOLDOWN_MS });
        setNow(at);
      } else {
        setError(
          message ||
            "We couldn't send the code right now. Try again in a few minutes.",
        );
      }
    } finally {
      setResending(false);
    }
  };

  const seconds = Math.ceil(remainingMs / 1000);
  const countdown = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <View>
      <Pressable
        onPress={onEditEmail}
        style={styles.back}
        accessibilityRole="button"
        accessibilityLabel="Back to your details"
      >
        <MaterialCommunityIcons
          name="chevron-left"
          size={28}
          color={colors.textPrimary}
        />
      </Pressable>

      <Text style={styles.title} accessibilityRole="header">
        Check your email
      </Text>
      <Text style={styles.caption}>We sent a 6-digit code to</Text>
      <View style={styles.emailRow}>
        <Text style={styles.email} numberOfLines={2}>
          {email}
        </Text>
        <Pressable
          onPress={onEditEmail}
          style={styles.textButton}
          accessibilityRole="button"
          accessibilityLabel="Edit email"
        >
          <Text style={styles.textButtonLabel}>Edit</Text>
        </Pressable>
      </View>

      <Text style={styles.label}>Code</Text>
      <TextInput
        ref={inputRef}
        value={code}
        onChangeText={(text) => {
          const digits = text.replace(/\D/g, "").slice(0, 6);
          setCode(digits);
          setSelection(undefined);
          if (error) setError(null);
          if (digits.length === 6) void submit(digits);
        }}
        selection={selection}
        onSelectionChange={() => setSelection(undefined)}
        editable={!submitting && !codeLocked}
        autoFocus
        maxLength={6}
        keyboardType="number-pad"
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        importantForAutofill="yes"
        returnKeyType="done"
        onSubmitEditing={() => void submit(code)}
        accessibilityLabel="6-digit code"
        style={[
          styles.codeInput,
          error ? styles.codeInputError : null,
          codeLocked && styles.codeInputLocked,
        ]}
      />
      {error ? (
        <View style={styles.errorRow} accessibilityLiveRegion="polite">
          <MaterialCommunityIcons
            name="alert-circle"
            size={16}
            color={colors.danger}
          />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <Button
        label="Verify and create account"
        onPress={() => void submit(code)}
        loading={submitting}
        disabled={code.length !== 6 || codeLocked}
      />

      <View style={styles.resendRow}>
        {dailyLock || ipCapMessage ? (
          <Text style={styles.caption}>{dailyLock ?? ipCapMessage}</Text>
        ) : canResend || resending ? (
          <Pressable
            onPress={() => void resend()}
            disabled={!canResend}
            style={styles.textButton}
            accessibilityRole="button"
            accessibilityLabel="Resend code"
          >
            <Text style={styles.textButtonLabel}>
              {resending ? "Sending…" : "Resend code"}
            </Text>
          </Pressable>
        ) : (
          <Text style={styles.caption}>Resend code in {countdown}</Text>
        )}
      </View>

      <Text style={styles.hint}>
        It can take a minute. Check spam if it doesn't arrive.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  back: {
    width: size.minTouch,
    height: size.minTouch,
    justifyContent: "center",
    marginTop: spacing.md,
    marginLeft: -spacing.sm,
  },
  title: { ...typography.title, marginTop: spacing.sm },
  caption: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  emailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  email: { ...typography.body, color: colors.textPrimary, flexShrink: 1 },
  textButton: {
    minHeight: size.minTouch,
    minWidth: size.minTouch,
    justifyContent: "center",
    alignItems: "center",
  },
  textButtonLabel: {
    ...typography.body,
    fontWeight: "700",
    color: colors.accentText,
  },
  label: {
    ...typography.caption,
    fontWeight: "600",
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  codeInput: {
    ...typography.title,
    height: 56,
    textAlign: "center",
    letterSpacing: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  codeInputError: { borderColor: colors.danger },
  codeInputLocked: { opacity: 0.5 },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.small,
    fontWeight: "500",
    color: colors.danger,
    flexShrink: 1,
  },
  resendRow: {
    alignItems: "center",
    marginTop: spacing.md,
    minHeight: size.minTouch,
    justifyContent: "center",
  },
  hint: {
    ...typography.small,
    fontWeight: "500",
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.xs,
  },
});
