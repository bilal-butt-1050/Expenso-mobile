import React, { useEffect, useMemo } from "react";
import { AppState } from "react-native";
import { QueryClientProvider } from "@tanstack/react-query";
import { PersistQueryClientProvider, persistQueryClientSave } from "@tanstack/react-query-persist-client";
import { useAuth } from "../context/AuthContext";
import { PERSIST_MAX_AGE_MS, queryClient, persisterForUser } from "./queryClient";
// Registers the mutation defaults. It must run before the persisted cache is restored, or a
// restored offline write has no function to replay with.
import { dropForeignWrites } from "./mutations";

/**
 * Provides the query cache, persisted to AsyncStorage **per user**.
 *
 * Mounted inside `AuthProvider` so it can key the persisted cache by user id. While signed out
 * there is nothing worth persisting, so the plain provider is used — which also means a signed
 * out device holds no financial data on disk.
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;

  const persistOptions = useMemo(
    () => (userId ? { persister: persisterForUser(userId), maxAge: PERSIST_MAX_AGE_MS } : null),
    [userId]
  );

  // The persister throttles writes to once a second. Save now when the app leaves the foreground,
  // so a delete committed at that moment (or a write just queued) is on disk if the OS kills us.
  useEffect(() => {
    if (!persistOptions) return;
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") {
        void persistQueryClientSave({ queryClient, persister: persistOptions.persister }).catch(() => {});
      }
    });
    return () => sub.remove();
  }, [persistOptions]);

  if (!persistOptions || !userId) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={persistOptions}
      onSuccess={() => {
        // Only this user's writes may replay under this user's token (threat S3 / M5).
        dropForeignWrites(userId);
        // Then replay anything paused while offline, in order.
        void queryClient.resumePausedMutations();
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
