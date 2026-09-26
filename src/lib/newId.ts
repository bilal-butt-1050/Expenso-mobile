/**
 * A client-generated id for a new transaction, so an offline write replayed after a lost response
 * returns the row it already created instead of a duplicate (ARCH N7.3).
 *
 * Uses the UUID v4 generator that expo-modules-core installs on every Expo build
 * (`java.util.UUID.randomUUID()`, backed by SecureRandom). `expo-crypto` would need a new native
 * build, so it couldn't ship as an OTA update to installed apps (D-44). If the binding is ever
 * missing, the write is sent without an id: the server assigns one, and only replay protection is
 * lost.
 */
export function newTransactionId(): string | undefined {
  const uuidv4 = (globalThis as { expo?: { uuidv4?: () => string } }).expo?.uuidv4;
  return typeof uuidv4 === "function" ? uuidv4().toLowerCase() : undefined;
}
