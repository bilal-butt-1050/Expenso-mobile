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

export async function register(email: string, password: string, name?: string): Promise<User> {
  const { data } = await apiClient.post<AuthResponse>("/auth/register", { email, password, name });
  await setToken(data.token);
  return data.user;
}

export async function fetchCurrentUser(): Promise<User> {
  const { data } = await apiClient.get<User>("/auth/me");
  return data;
}

export async function logout(): Promise<void> {
  await clearToken();
}

export async function updateProfile(data: {
  name?: string;
  savingsGoal?: number;
  currency?: string;
}): Promise<User> {
  const { data: user } = await apiClient.patch<User>("/auth/profile", data);
  return user;
}
