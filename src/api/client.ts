import axios from "axios";
import Constants from "expo-constants";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "expenso_auth_token";

declare const process: { env: Record<string, string | undefined> };

function resolveApiUrl(): string {
  // 1. Web browser runs on the same PC, so localhost or explicit URL works directly
  if (Platform.OS === "web") {
    return process.env.EXPO_PUBLIC_API_URL || Constants.expoConfig?.extra?.apiUrl || "http://localhost:4000";
  }

  // 2. On a mobile device in Expo Go (LAN mode), dynamically use the exact IP
  // the phone used to download the bundle from Metro (hostUri).
  // This automatically handles changing Wi-Fi networks and dynamic DHCP IPs!
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(":")[0];
    if (host && !host.includes("exp.direct") && host !== "localhost" && host !== "127.0.0.1") {
      return `http://${host}:4000`;
    }
  }

  // 3. Fallback to EXPO_PUBLIC_API_URL if defined (tunnel mode or manual override)
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // 4. Fallback to extra.apiUrl from app.json
  const extraUrl = Constants.expoConfig?.extra?.apiUrl as string | undefined;
  if (extraUrl && !extraUrl.includes("localhost") && !extraUrl.includes("127.0.0.1")) {
    return extraUrl;
  }

  return extraUrl || "http://localhost:4000";
}

const apiUrl = resolveApiUrl();

if (__DEV__) {
  console.log(`[Expenso API] Connecting to: ${apiUrl}`);
}

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
