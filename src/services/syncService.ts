import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState, AppStateStatus } from "react-native";
import * as expensesApi from "../api/expenses";
import * as incomeApi from "../api/income";
import * as loansApi from "../api/loans";

export type OutboxActionType =
  | "CREATE_EXPENSE"
  | "DELETE_EXPENSE"
  | "CREATE_INCOME"
  | "DELETE_INCOME"
  | "CREATE_LOAN"
  | "SETTLE_LOAN"
  | "DELETE_LOAN";

export interface OutboxItem {
  id: string;
  action: OutboxActionType;
  payload: any;
  createdAt: number;
}

const OUTBOX_KEY = "@expenso_sync_outbox";
const CACHE_PREFIX = "@expenso_cache_";

type SyncListener = (state: { isSyncing: boolean; pendingCount: number }) => void;

class SyncService {
  private isSyncing = false;
  private listeners: Set<SyncListener> = new Set();

  constructor() {
    AppState.addEventListener("change", this.handleAppStateChange);
  }

  private handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (nextAppState === "active") {
      this.syncPendingActions();
    }
  };

  subscribe(listener: SyncListener) {
    this.listeners.add(listener);
    this.notify();
    return () => {
      this.listeners.delete(listener);
    };
  }

  private async notify() {
    const pending = await this.getOutbox();
    const state = { isSyncing: this.isSyncing, pendingCount: pending.length };
    this.listeners.forEach((l) => l(state));
  }

  // --- Local Cache Helpers ---
  async getCache<T>(key: string): Promise<T | null> {
    try {
      const raw = await AsyncStorage.getItem(`${CACHE_PREFIX}${key}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  async setCache<T>(key: string, data: T): Promise<void> {
    try {
      await AsyncStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(data));
    } catch {
      // Storage quota or error
    }
  }

  // --- Outbox Queue Helpers ---
  async getOutbox(): Promise<OutboxItem[]> {
    try {
      const raw = await AsyncStorage.getItem(OUTBOX_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  async queueAction(action: OutboxActionType, payload: any): Promise<OutboxItem> {
    const item: OutboxItem = {
      id: `outbox-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      action,
      payload,
      createdAt: Date.now(),
    };

    const queue = await this.getOutbox();
    queue.push(item);
    await AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify(queue));
    this.notify();

    // Trigger background sync attempt if internet is available
    this.syncPendingActions().catch(() => {});
    return item;
  }

  // --- Replay Sync Engine ---
  async syncPendingActions(): Promise<{ success: boolean; syncedCount: number }> {
    if (this.isSyncing) return { success: false, syncedCount: 0 };

    const queue = await this.getOutbox();
    if (queue.length === 0) return { success: true, syncedCount: 0 };

    this.isSyncing = true;
    this.notify();

    let syncedCount = 0;
    const remaining: OutboxItem[] = [];

    for (const item of queue) {
      try {
        switch (item.action) {
          case "CREATE_EXPENSE":
            await expensesApi.createExpense(item.payload);
            break;
          case "DELETE_EXPENSE":
            await expensesApi.deleteExpense(item.payload.id);
            break;
          case "CREATE_INCOME":
            await incomeApi.createIncome(item.payload);
            break;
          case "DELETE_INCOME":
            await incomeApi.deleteIncome(item.payload.id);
            break;
          case "CREATE_LOAN":
            await loansApi.createLoan(item.payload);
            break;
          case "SETTLE_LOAN":
            await loansApi.settleLoan(item.payload.id, item.payload.amount);
            break;
          case "DELETE_LOAN":
            await loansApi.deleteLoan(item.payload.id);
            break;
        }
        syncedCount++;
      } catch (err: any) {
        // If network error (offline), stop processing queue and keep remaining
        if (!err.response) {
          remaining.push(item);
          // Push rest of queue as well
          const currentIndex = queue.indexOf(item);
          remaining.push(...queue.slice(currentIndex + 1));
          break;
        } else if (err.response.status === 404 || err.response.status === 400) {
          // Bad request or already deleted item — skip this item to not block queue
          syncedCount++;
        } else {
          remaining.push(item);
        }
      }
    }

    await AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify(remaining));
    this.isSyncing = false;
    this.notify();

    return { success: true, syncedCount };
  }
}

export const syncService = new SyncService();
