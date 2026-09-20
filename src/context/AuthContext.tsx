import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { User } from "../types/models";
import { getToken, clearToken, setUnauthorizedHandler } from "../api/client";
import { setActiveCurrency } from "../utils/currency";
import * as authApi from "../api/auth";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  sendOtp: (email: string) => Promise<void>;
  register: (email: string, password: string, name: string, otp?: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateProfile: (data: { name?: string; currency?: string; avatarUrl?: string | null }) => Promise<void>;
  changePassword: (currentPassword?: string, newPassword?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user?.currency) {
      setActiveCurrency(user.currency);
    }
  }, [user?.currency]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
    });
    return () => {
      setUnauthorizedHandler(null);
    };
  }, []);

  // On app launch: load cached profile immediately for 0-latency offline access,
  // then attempt to refresh in background without clearing session on network failures.
  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (!token) {
        setIsLoading(false);
        return;
      }

      // 1. Immediately restore cached user if available
      try {
        const cached = await AsyncStorage.getItem("@expenso_cached_user");
        if (cached) {
          const parsed = JSON.parse(cached);
          setUser(parsed);
          if (parsed.currency) setActiveCurrency(parsed.currency);
        }
      } catch {}

      // 2. Fetch latest from server
      try {
        const me = await authApi.fetchCurrentUser();
        setUser(me);
        await AsyncStorage.setItem("@expenso_cached_user", JSON.stringify(me));
      } catch (err: any) {
        // ONLY clear token if the server explicitly returned 401 Unauthorized
        if (err.response?.status === 401) {
          await clearToken();
          await AsyncStorage.removeItem("@expenso_cached_user");
          setUser(null);
        }
        // If it's a network error / offline, keep the cached user session active!
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const saveUserAndCache = async (userData: User | null) => {
    setUser(userData);
    if (userData) {
      await AsyncStorage.setItem("@expenso_cached_user", JSON.stringify(userData));
    } else {
      await AsyncStorage.removeItem("@expenso_cached_user");
    }
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      login: async (email, password) => {
        const u = await authApi.login(email, password);
        await saveUserAndCache(u);
      },
      sendOtp: async (email) => await authApi.sendOtp(email),
      register: async (email, password, name, otp) => {
        const u = await authApi.register(email, password, name, otp);
        await saveUserAndCache(u);
      },
      loginWithGoogle: async (idToken) => {
        const u = await authApi.loginWithGoogle(idToken);
        await saveUserAndCache(u);
      },
      logout: async () => {
        try {
          await authApi.logout();
        } catch {}
        await clearToken();
        await saveUserAndCache(null);
      },
      refreshUser: async () => {
        const u = await authApi.fetchCurrentUser();
        await saveUserAndCache(u);
      },
      updateProfile: async (data) => {
        const u = await authApi.updateProfile(data);
        await saveUserAndCache(u);
      },
      changePassword: async (currentPassword, newPassword) => await authApi.changePassword(currentPassword, newPassword),
    }),
    [user, isLoading]
  );


  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
