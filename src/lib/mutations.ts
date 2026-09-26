import axios from "axios";
import { InfiniteData, MutationKey, onlineManager } from "@tanstack/react-query";
import * as txApi from "../api/transactions";
import * as loansApi from "../api/loans";
import { getErrorMessage } from "../api/client";
import { Loan, LoanInput, TransactionInput } from "../types/models";
import { invalidateMoney, queryClient } from "./queryClient";
import { showSnackbar } from "../components/snackbar/snackbarBridge";

/**
 * Every money write, defined once (ARCH N7.1).
 *
 * The defaults own the `mutationFn`, ordering and error handling, not the hooks. A write queued
 * offline is persisted and may be replayed after a restart, when no screen exists to own it.
 * TanStack rebuilds it from these defaults by `mutationKey`. Without them a restored mutation had
 * no function at all and failed with "No mutationFn found".
 */

export const mutationKeys = {
  createTransaction: ["transactions", "create"],
  updateTransaction: ["transactions", "update"],
  deleteTransaction: ["transactions", "delete"],
  createLoan: ["loans", "create"],
  updateLoan: ["loans", "update"],
  settleLoan: ["loans", "settle"],
  deleteLoan: ["loans", "delete"],
} satisfies Record<string, MutationKey>;

/**
 * Carried by every write and persisted with it. `title` names the entry in failure messages.
 * `background` means no screen is waiting on the result: it was queued offline, or it's a
 * committed undo, so failure is reported in the snackbar rather than on a form.
 */
interface WriteMeta {
  title: string;
  background?: boolean;
}

export type CreateTransactionVars = WriteMeta & { input: TransactionInput & { id?: string } };
export type UpdateTransactionVars = WriteMeta & { id: string; input: Partial<TransactionInput> };
export type DeleteTransactionVars = WriteMeta & { id: string };
export type CreateLoanVars = WriteMeta & { input: LoanInput };
export type UpdateLoanVars = WriteMeta & { id: string; input: Partial<LoanInput> };
export type SettleLoanVars = WriteMeta & { id: string; amount?: number };
export type DeleteLoanVars = WriteMeta & { id: string };

/** Writes that move money replay one at a time, in order: a queued create runs before its delete. */
const MONEY_SCOPE = { id: "money" };

const statusOf = (error: unknown) => (axios.isAxiosError(error) ? error.response?.status : undefined);

// --- Reporting failed background writes (S-8) ------------------------------------------------
// Failures that land together (one reconnect replaying a queue) become one message, not a stack.
let failedTitles: string[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function reportFailedSave(title: string, error: unknown) {
  failedTitles.push(title);
  const reason = getErrorMessage(error);
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    const titles = failedTitles;
    failedTitles = [];
    flushTimer = null;
    showSnackbar({
      id: `S-8-${Date.now()}`,
      text:
        titles.length === 1
          ? `Couldn't save ${titles[0]}. ${reason}`
          : `Couldn't save ${titles.length} offline changes.`,
      icon: "alert-circle-outline",
      duration: 8000,
      priority: 2,
      sticky: true,
    });
  }, 500);
}

function onWriteError(error: unknown, vars: WriteMeta) {
  // Show the server's truth again, whatever the optimistic state was.
  invalidateMoney();
  if (vars.background) reportFailedSave(vars.title, error);
}

// --- Transactions ----------------------------------------------------------------------------
queryClient.setMutationDefaults(mutationKeys.createTransaction, {
  mutationFn: (vars: CreateTransactionVars) => txApi.createTransaction(vars.input),
  scope: MONEY_SCOPE,
  onSuccess: invalidateMoney,
  onError: (error: unknown, vars: CreateTransactionVars) => onWriteError(error, vars),
});

queryClient.setMutationDefaults(mutationKeys.updateTransaction, {
  mutationFn: (vars: UpdateTransactionVars) => txApi.updateTransaction(vars.id, vars.input),
  scope: MONEY_SCOPE,
  onSuccess: invalidateMoney,
  onError: (error: unknown, vars: UpdateTransactionVars) => onWriteError(error, vars),
});

queryClient.setMutationDefaults(mutationKeys.deleteTransaction, {
  // A 404 means the row is already gone (a replayed or doubled delete): that's success.
  mutationFn: async (vars: DeleteTransactionVars) => {
    try {
      await txApi.deleteTransaction(vars.id);
    } catch (error) {
      if (statusOf(error) === 404) return;
      throw error;
    }
  },
  scope: MONEY_SCOPE,
  // Drop the row at once; a failure refetches it back.
  onMutate: async (vars: DeleteTransactionVars) => {
    await queryClient.cancelQueries({ queryKey: ["transactions"] });
    queryClient.setQueriesData<InfiniteData<txApi.TransactionPage>>({ queryKey: ["transactions"] }, (old) =>
      old?.pages
        ? {
            ...old,
            pages: old.pages.map((page) => ({ ...page, items: page.items.filter((t) => t.id !== vars.id) })),
          }
        : old
    );
  },
  onSuccess: invalidateMoney,
  onError: (error: unknown, vars: DeleteTransactionVars) => {
    invalidateMoney();
    if (!vars.background) return;
    showSnackbar({
      id: `S-5-${vars.id}`,
      text: `Couldn't delete ${vars.title}. ${getErrorMessage(error)}`,
      icon: "alert-circle-outline",
      duration: 6000,
      priority: 2,
      sticky: true,
    });
  },
});

// --- Loans ------------------------------------------------------------------------------------
// Loan writes aren't idempotent on the server (only transactions take a client id), but they
// share the money scope so they replay in order with everything else.
queryClient.setMutationDefaults(mutationKeys.createLoan, {
  mutationFn: (vars: CreateLoanVars) => loansApi.createLoan(vars.input),
  scope: MONEY_SCOPE,
  onSuccess: invalidateMoney,
  onError: (error: unknown, vars: CreateLoanVars) => onWriteError(error, vars),
});

queryClient.setMutationDefaults(mutationKeys.updateLoan, {
  mutationFn: (vars: UpdateLoanVars) => loansApi.updateLoan(vars.id, vars.input),
  scope: MONEY_SCOPE,
  onSuccess: invalidateMoney,
  onError: (error: unknown, vars: UpdateLoanVars) => onWriteError(error, vars),
});

queryClient.setMutationDefaults(mutationKeys.settleLoan, {
  mutationFn: (vars: SettleLoanVars) => loansApi.settleLoan(vars.id, vars.amount),
  scope: MONEY_SCOPE,
  onSuccess: invalidateMoney,
  onError: (error: unknown, vars: SettleLoanVars) => onWriteError(error, vars),
});

queryClient.setMutationDefaults(mutationKeys.deleteLoan, {
  mutationFn: async (vars: DeleteLoanVars) => {
    try {
      await loansApi.deleteLoan(vars.id);
    } catch (error) {
      if (statusOf(error) === 404) return;
      throw error;
    }
  },
  scope: MONEY_SCOPE,
  onMutate: async (vars: DeleteLoanVars) => {
    await queryClient.cancelQueries({ queryKey: ["loans"] });
    // ["loans"] also prefixes the summary query, which isn't a list: leave it alone.
    queryClient.setQueriesData({ queryKey: ["loans"] }, (old: unknown) =>
      Array.isArray(old) ? (old as Loan[]).filter((l) => l.id !== vars.id) : old
    );
  },
  onSuccess: invalidateMoney,
  onError: (error: unknown, vars: DeleteLoanVars) => onWriteError(error, vars),
});

/**
 * Online, a screen awaits the write so the server's answer (a validation error, say) shows where
 * the user is. Offline, TanStack pauses the write until the network returns, so awaiting it would
 * hang the screen. It's queued as a background write instead, and the caller carries on.
 */
export async function submitWrite<V extends WriteMeta, R>(
  mutation: { mutate: (vars: V) => void; mutateAsync: (vars: V) => Promise<R> },
  vars: V
): Promise<R | undefined> {
  if (!onlineManager.isOnline()) {
    mutation.mutate({ ...vars, background: true });
    return undefined;
  }
  return mutation.mutateAsync(vars);
}

// --- Discarded writes (S-9) ---------------------------------------------------------------------
/**
 * Queued writes thrown away when a session ends, or because they belonged to another account, are
 * reported rather than lost silently. The message is sticky and the snackbar only shows over the
 * tabs, so after a sign-out it waits and appears at the first tab focus after the next sign-in.
 * It's held in memory only (the purge wipes storage); if the app process dies first, it's lost.
 */
export function noteDiscardedWrites(count: number) {
  if (count <= 0) return;
  showSnackbar({
    id: "S-9",
    text: `${count} offline change${count === 1 ? "" : "s"} weren't saved.`,
    icon: "alert-outline",
    duration: 8000,
    priority: 2,
    sticky: true,
  });
}

/** Paused writes waiting for the network. */
export function countPausedWrites(): number {
  return queryClient.getMutationCache().getAll().filter((m) => m.state.isPaused).length;
}

/**
 * Before replaying a restored queue, remove every write that isn't this user's, including ones from
 * builds that didn't tag writes. Those would run under the wrong account, or have no function to
 * run at all (threat S3 / M5).
 */
export function dropForeignWrites(userId: string) {
  const cache = queryClient.getMutationCache();
  let dropped = 0;
  for (const mutation of cache.getAll()) {
    if (mutation.meta?.userId !== userId) {
      if (mutation.state.isPaused) dropped += 1;
      cache.remove(mutation);
    }
  }
  noteDiscardedWrites(dropped);
}
