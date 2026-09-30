import { z } from "zod";

/**
 * Field rules, with the server's limits (the backend's zod schemas), so a form says what's wrong
 * before a round trip. The server still validates everything; these only catch it sooner.
 */
export const MAX_AMOUNT = 999_999_999_999.99;

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Enter your email")
  .max(254, "That email is too long")
  .email("Enter a valid email, like name@example.com");

/** A new password (sign-up, change password). */
export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(200, "Use 200 characters or fewer");

/** Signing in: any existing password, just not empty. */
export const loginPasswordSchema = z.string().min(1, "Enter your password").max(200, "That password is too long");

export const nameSchema = z.string().trim().min(1, "Enter your name").max(80, "Use 80 characters or fewer");

export const personNameSchema = z
  .string()
  .trim()
  .min(1, "Enter who this loan is with")
  .max(80, "Use 80 characters or fewer");

export const categoryNameSchema = z
  .string()
  .trim()
  .min(1, "Give this category a name")
  .max(30, "Use 30 characters or fewer");

const numberSchema = (message: string) =>
  z.number({ required_error: message, invalid_type_error: message }).finite(message);

/** Every money amount on a record: more than 0. */
export const amountSchema = numberSchema("Enter an amount above 0")
  .gt(0, "Enter an amount above 0")
  .max(MAX_AMOUNT, "That amount is too large");

/** Money you have: 0 or more (D-64). */
export const cashSchema = numberSchema("Enter how much you have, or 0")
  .min(0, "Enter how much you have, or 0")
  .max(MAX_AMOUNT, "That amount is too large");

/** A formatted amount ("12,500.50") as a number; NaN when empty, which the schemas reject. */
export function parseAmount(text: string): number {
  return text.trim() === "" ? NaN : Number(text.replace(/,/g, ""));
}

/** The first problem with `value` under `schema`, or null when it's valid. */
export function check(schema: z.ZodTypeAny, value: unknown): string | null {
  const result = schema.safeParse(value);
  return result.success ? null : (result.error.issues[0]?.message ?? "Check this field");
}
