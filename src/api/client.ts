import axios from "axios";
import Constants from "expo-constants";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "expenso_auth_token";

// `extra.apiUrl` comes from app.json so switching between a local backend
// and a deployed one is a config change, not a code change.
const apiUrl = (Constants.expoConfig?.extra?.apiUrl as string) ?? "http://localhost:4000";

export const apiClient = axios.create({ baseURL: apiUrl, timeout: 15000 });

// Every request automatically carries the signed-in user's token, so
// screens and hooks never have to think about auth headers.
apiClient.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    if (!config.headers) {
      config.headers = {} as any;
    }
    if (typeof (config.headers as any).set === "function") {
      (config.headers as any).set("Authorization", `Bearer ${token}`);
    } else {
      (config.headers as any).Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export async function getToken(): Promise<string | null> {
  if (Platform.OS === "web") {
    return await AsyncStorage.getItem(TOKEN_KEY);
  }
  return await SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  if (Platform.OS === "web") {
    await AsyncStorage.setItem(TOKEN_KEY, token);
    return;
  }
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  if (Platform.OS === "web") {
    await AsyncStorage.removeItem(TOKEN_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

// Normalizes whatever axios/the API throws into a plain readable message,
// so every screen can just do `catch (e) { showError(getErrorMessage(e)) }`.
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { error?: string } | undefined;
    if (data?.error) return data.error;
    if (error.message === "Network Error") return "Can't reach the server — check your connection.";
  }
  return "Something went wrong. Please try again.";
}
