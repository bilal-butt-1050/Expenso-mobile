import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { User } from "../types/models";
import { getToken, clearToken } from "../api/client";
import * as authApi from "../api/auth";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
      register: async (email, password, name) => setUser(await authApi.register(email, password, name)),
      logout: async () => {
        await authApi.logout();
        setUser(null);
      },
      refreshUser: async () => setUser(await authApi.fetchCurrentUser()),
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
