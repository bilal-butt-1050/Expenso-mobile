import { useAuth } from "../context/AuthContext";
import { toMonthKey } from "../utils/date";

/**
 * When the account was created: history starts there (D-67). Pickers stop at it, and the server
 * refuses anything dated earlier. Undefined for a user cached by an older build without it.
 */
export function useJoined(): { date: Date | undefined; month: string | undefined } {
  const { user } = useAuth();
  if (!user?.createdAt) return { date: undefined, month: undefined };
  const date = new Date(user.createdAt);
  if (Number.isNaN(date.getTime())) return { date: undefined, month: undefined };
  return { date, month: toMonthKey(date) };
}
