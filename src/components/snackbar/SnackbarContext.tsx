import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, AppState, BackHandler } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

/**
 * One app-wide snackbar (DESIGN §S3). One message is visible at a time. It is rendered by
 * `SnackbarHost` inside the tab navigator, so it only ever appears over tab screens.
 *
 * M1 ships the core: queue rules 1, 4 and 5 and the non-undo lifecycle. Undo (commit on expiry)
 * arrives in M2 as an additive `onExpire` callback.
 */

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

export interface SnackbarAction {
  label: string;
  a11yLabel: string;
  onPress: () => void;
}

export interface SnackbarMessage {
  /** Catalogue id (e.g. "S-6"). Also de-duplicates: showing an id that is visible or queued is a no-op. */
  id: string;
  text: string;
  icon?: IconName;
  iconColor?: string;
  action?: SnackbarAction;
  /** Milliseconds before it auto-dismisses. Doubled while a screen reader is on (WCAG 2.2.1). */
  duration: number;
  /** 1 is the highest. Equal priorities are FIFO. */
  priority: number;
}

export interface SnackbarEntry extends SnackbarMessage {
  key: number;
  enqueuedAt: number;
}

interface SnackbarContextValue {
  show: (message: SnackbarMessage) => void;
  dismiss: () => void;
  /** True when nothing is visible or queued. Callers of low-priority prompts (S-7) check this first. */
  isIdle: () => boolean;
}

interface SnackbarHostValue {
  current: SnackbarEntry | null;
  setHostActive: (active: boolean) => void;
}

/** Messages waiting while a stack screen covered the tabs are dropped if older than this. */
const MAX_QUEUED_AGE_MS = 10_000;
/** Queued messages beyond this are dropped, lowest priority and oldest first (rule 4). */
const MAX_QUEUED = 3;

const SnackbarContext = createContext<SnackbarContextValue | null>(null);
const SnackbarHostContext = createContext<SnackbarHostValue | null>(null);

function byPriorityThenAge(a: SnackbarEntry, b: SnackbarEntry) {
  return a.priority - b.priority || a.key - b.key;
}

export function SnackbarProvider({ children }: { children: React.ReactNode }) {
  const [current, setCurrent] = useState<SnackbarEntry | null>(null);
  const [queue, setQueue] = useState<SnackbarEntry[]>([]);
  const [hostActive, setHostActive] = useState(false);
  const [screenReader, setScreenReader] = useState(false);
  const nextKey = useRef(1);

  // Refs so `show`/`isIdle` stay stable and never read a stale render (rn-review 2.1).
  const currentRef = useRef(current);
  const queueRef = useRef(queue);
  currentRef.current = current;
  queueRef.current = queue;

  const show = useCallback((message: SnackbarMessage) => {
    const already =
      currentRef.current?.id === message.id || queueRef.current.some((q) => q.id === message.id);
    if (already) return;
    const entry: SnackbarEntry = { ...message, key: nextKey.current++, enqueuedAt: Date.now() };
    setQueue((q) => {
      const next = [...q, entry].sort(byPriorityThenAge);
      while (next.length > MAX_QUEUED) {
        // Drop the lowest-priority, oldest entry.
        const worst = next.reduce((w, e) =>
          e.priority > w.priority || (e.priority === w.priority && e.key < w.key) ? e : w
        );
        next.splice(next.indexOf(worst), 1);
      }
      return next;
    });
  }, []);

  const dismiss = useCallback(() => setCurrent(null), []);

  const isIdle = useCallback(
    () => currentRef.current === null && queueRef.current.length === 0,
    []
  );

  // Promote the next queued message whenever the slot is free and the tabs are showing.
  useEffect(() => {
    if (current || !hostActive || queue.length === 0) return;
    const now = Date.now();
    const fresh = queue.filter((q) => now - q.enqueuedAt <= MAX_QUEUED_AGE_MS);
    const [head, ...rest] = fresh;
    setQueue(rest);
    if (head) setCurrent(head);
  }, [current, hostActive, queue]);

  // A stack screen covered the tabs: dismiss what's visible, keep the queue (lifecycle table).
  useEffect(() => {
    if (!hostActive) setCurrent(null);
  }, [hostActive]);

  // Auto-dismiss.
  const currentKey = current?.key;
  const currentDuration = current?.duration;
  useEffect(() => {
    if (currentKey === undefined || currentDuration === undefined) return;
    const timer = setTimeout(
      () => setCurrent((c) => (c?.key === currentKey ? null : c)),
      screenReader ? currentDuration * 2 : currentDuration
    );
    return () => clearTimeout(timer);
  }, [currentKey, currentDuration, screenReader]);

  // Announce once per message.
  const currentText = current?.text;
  const currentActionLabel = current?.action?.label;
  useEffect(() => {
    if (currentKey === undefined || !currentText) return;
    AccessibilityInfo.announceForAccessibility(
      currentActionLabel ? `${currentText}. ${currentActionLabel} available.` : currentText
    );
  }, [currentKey, currentText, currentActionLabel]);

  // Android back only dismisses the snackbar while one is visible (rule 1).
  useEffect(() => {
    if (currentKey === undefined) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      setCurrent(null);
      return true;
    });
    return () => sub.remove();
  }, [currentKey]);

  // Backgrounding dismisses the visible message and clears the queue.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "background") {
        setCurrent(null);
        setQueue([]);
      }
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isScreenReaderEnabled()
      .then((on) => {
        if (!cancelled) setScreenReader(on);
      })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener("screenReaderChanged", setScreenReader);
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);

  const api = useMemo(() => ({ show, dismiss, isIdle }), [show, dismiss, isIdle]);
  const host = useMemo(() => ({ current, setHostActive }), [current]);

  return (
    <SnackbarContext.Provider value={api}>
      <SnackbarHostContext.Provider value={host}>{children}</SnackbarHostContext.Provider>
    </SnackbarContext.Provider>
  );
}

export function useSnackbar(): SnackbarContextValue {
  const ctx = useContext(SnackbarContext);
  if (!ctx) throw new Error("useSnackbar must be used inside SnackbarProvider");
  return ctx;
}

export function useSnackbarHost(): SnackbarHostValue {
  const ctx = useContext(SnackbarHostContext);
  if (!ctx) throw new Error("useSnackbarHost must be used inside SnackbarProvider");
  return ctx;
}
