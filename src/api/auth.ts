import axios from "axios";
import { apiClient, setToken, clearToken } from "./client";
import { User } from "../types/models";

interface AuthResponse {
  token: string;
  user: User;
}

export async function login(email: string, password: string): Promise<User> {
  const { data } = await apiClient.post<AuthResponse>("/auth/login", { email, password });
  await setToken(data.token);
  return data.user;
}

export async function sendOtp(email: string): Promise<void> {
  await apiClient.post("/auth/send-otp", { email });
}

export async function loginWithGoogle(idToken: string): Promise<User> {
  const { data } = await apiClient.post<AuthResponse>("/auth/google", { idToken });
  await setToken(data.token);
  return data.user;
}

export async function register(email: string, password: string, name: string, otp?: string): Promise<User> {
  const { data } = await apiClient.post<AuthResponse>("/auth/register", { email, password, name, otp });
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
export async function changePassword(body: {
  currentPassword?: string;
  newPassword: string;
  googleIdToken?: string;
}): Promise<void> {
  const { data } = await apiClient.patch<{ token: string }>("/auth/password", body);
  await setToken(data.token);
}
