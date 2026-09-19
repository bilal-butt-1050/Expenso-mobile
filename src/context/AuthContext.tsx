import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
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

  // On app launch: if a token is already stored, try to load the profile
  // it belongs to so the user lands straight on the dashboard instead of
  // the login screen every time they reopen the app.
  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const me = await authApi.fetchCurrentUser();
        setUser(me);
      } catch {
        await clearToken();
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      login: async (email, password) => setUser(await authApi.login(email, password)),
      sendOtp: async (email) => await authApi.sendOtp(email),
      register: async (email, password, name, otp) => setUser(await authApi.register(email, password, name, otp)),
      loginWithGoogle: async (idToken) => setUser(await authApi.loginWithGoogle(idToken)),
      logout: async () => {
        await authApi.logout();
        setUser(null);
      },
      refreshUser: async () => setUser(await authApi.fetchCurrentUser()),
      updateProfile: async (data) => setUser(await authApi.updateProfile(data)),
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
