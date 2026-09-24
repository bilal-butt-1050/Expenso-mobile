import React, { useMemo } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { useAuth } from "../context/AuthContext";
import { queryClient, persisterForUser } from "./queryClient";

/**
 * Provides the query cache, persisted to AsyncStorage **per user**.
 *
 * Mounted inside `AuthProvider` so it can key the persisted cache by user id. While signed out
 * there is nothing worth persisting, so the plain provider is used — which also means a signed
 * out device holds no financial data on disk.
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  const persistOptions = useMemo(
    () => (user?.id ? { persister: persisterForUser(user.id), maxAge: 24 * 60 * 60 * 1000 } : null),
    [user?.id]
  );

  if (!persistOptions) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={persistOptions}
      // Replay anything that was paused while offline, once the cache is rehydrated.
      onSuccess={() => {
        queryClient.resumePausedMutations();
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
