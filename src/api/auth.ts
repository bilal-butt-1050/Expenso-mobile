import axios from "axios";
import { apiClient, setToken, clearToken } from "./client";
import { User } from "../types/models";

interface AuthResponse {
  token: string;
  user: User;
}



/** Passwordless email (D-66), step 1: a 6-digit code to the address, account or not. */
export async function startEmailSignIn(email: string): Promise<void> {
  await apiClient.post("/auth/email/start", { email });
}

export type EmailCodeResult = { status: "signedIn"; user: User } | { status: "new"; signupTicket: string };

/** Step 2: an existing account is signed in (and its token stored); a new address gets a ticket. */
export async function verifyEmailCode(email: string, code: string): Promise<EmailCodeResult> {
  const { data } = await apiClient.post<
    { status: "signedIn"; token: string; user: User } | { status: "new"; signupTicket: string }
  >("/auth/email/verify", { email, code });
  if (data.status === "new") return data;
  await setToken(data.token);
  return { status: "signedIn", user: data.user };
}

/** Step 3, new accounts only: the ticket from step 2 and a name. */
export async function completeEmailSignUp(signupTicket: string, name: string): Promise<User> {
  const { data } = await apiClient.post<AuthResponse>("/auth/email/complete", { signupTicket, name });
  await setToken(data.token);
  return data.user;
}

export async function loginWithGoogle(idToken: string): Promise<User> {
  const { data } = await apiClient.post<AuthResponse>("/auth/google", { idToken });
  await setToken(data.token);
  return data.user;
}



export async function fetchCurrentUser(): Promise<User> {
  const { data } = await apiClient.get<User>("/auth/me");
  return data;
}

/** Deletes the account and all its data on the server. Irreversible. */
export async function deleteAccount(): Promise<void> {
  try {
    await apiClient.delete("/auth/account", { data: { confirm: "DELETE" } });
  } catch (error) {
    // A server from before the endpoint existed answers 404 with a route message, not a sentence.
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      throw new Error("Deleting accounts isn't available yet. Please try again later.");
    }
    throw error;
  }
}

export async function logout(): Promise<void> {
  await clearToken();
}

export async function updateProfile(data: {
  name?: string;
  currency?: string;
  avatarUrl?: string | null;
}): Promise<User> {
  const { data: user } = await apiClient.patch<User>("/auth/profile", data);
  return user;
}
/**
 * Changes the password, or sets the first one with a fresh Google ID token. The server ends every
 * session, this one included, and returns a new token for this device.
 */
