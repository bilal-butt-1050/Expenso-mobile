import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { User } from "../types/models";
import { getToken, clearToken, setUnauthorizedHandler } from "../api/client";
import { setActiveCurrency } from "../utils/currency";
import { clearAllCaches } from "../lib/queryClient";
import {
  cancelPendingFailureReports,
  countUnconfirmedWrites,
  noteDiscardedWrites,
  setActiveWriteUser,
} from "../lib/mutations";
import { resetSnackbarForPurge } from "../components/snackbar/snackbarBridge";
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

  /**
   * The one way a session ends: logout, a 401 on an authenticated request, or a 401 when the app
   * revalidates at launch. Clears the token, every cached query and queued write, and the cached
   * profile. The 401 paths used to clear only the token, leaving this account's data and queued
   * writes behind for whoever signed in next (threat S3). Discarded writes are reported (S-9).
   */
  const purgeSession = useCallback(async () => {
    // Synchronously, before anything awaits: from here no failure is reported for this account
    // (N3). Discard any pending undo rather than let it commit tokenless, and count it with the
    // unconfirmed writes about to be dropped.
    setActiveWriteUser(null);
    cancelPendingFailureReports();
    noteDiscardedWrites(resetSnackbarForPurge() + countUnconfirmedWrites());
    await clearToken();
    await clearAllCaches();
    try {
      await AsyncStorage.removeItem("@expenso_cached_user");
    } catch {}
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      void purgeSession();
    });
    return () => {
      setUnauthorizedHandler(null);
    };
  }, [purgeSession]);

  // On app launch: restore the cached profile and release the splash immediately, then refresh
  // from the server in the background. Blocking startup on /auth/me meant every cold start paid a
  // full network round-trip before the navigator could mount — seconds on a poor connection, for
  // data we already had on disk.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const token = await getToken();
      if (!token) {
        if (!cancelled) setIsLoading(false);
        return;
      }

      // 1. Restore the cached user and unblock the UI.
      try {
        const cached = await AsyncStorage.getItem("@expenso_cached_user");
        if (cached && !cancelled) {
          const parsed = JSON.parse(cached);
          setUser(parsed);
          if (parsed.currency) setActiveCurrency(parsed.currency);
        }
      } catch {}

      if (!cancelled) setIsLoading(false);

      // 2. Revalidate in the background. A network failure keeps the cached session alive;
      //    only an explicit 401 ends it.
      try {
        const me = await authApi.fetchCurrentUser();
        if (cancelled) return;
        setUser(me);
        await AsyncStorage.setItem("@expenso_cached_user", JSON.stringify(me));
      } catch (err: any) {
        if (cancelled) return;
        if (err.response?.status === 401) {
          await purgeSession();
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [purgeSession]);

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
        await purgeSession();
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
    [user, isLoading, purgeSession]
  );


  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
