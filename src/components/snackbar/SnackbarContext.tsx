import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from "react";
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
  /** Queued while a stack screen covered the tabs. Only these age out (lifecycle table). */
  enqueuedAway: boolean;
}

interface SnackbarContextValue {
  show: (message: SnackbarMessage) => void;
  dismiss: () => void;
}

interface SnackbarHostValue {
  current: SnackbarEntry | null;
  /** Nothing visible and nothing queued. Reactive, so prompts can wait for it. */
  idle: boolean;
  setHostActive: (active: boolean) => void;
  dismiss: () => void;
}

/** A message queued while away is dropped if the tabs come back later than this. */
const MAX_AWAY_AGE_MS = 10_000;
/** Queued messages beyond this are dropped, lowest priority and oldest first (rule 4). */
const MAX_QUEUED = 3;

interface State {
  current: SnackbarEntry | null;
  queue: SnackbarEntry[];
  hostActive: boolean;
  nextKey: number;
}

type Action =
  | { type: "show"; message: SnackbarMessage; now: number }
  | { type: "dismiss"; key?: number; now: number }
  | { type: "host"; active: boolean; now: number }
  | { type: "background" };

function byPriorityThenAge(a: SnackbarEntry, b: SnackbarEntry) {
  return a.priority - b.priority || a.key - b.key;
}

/** Fill the free slot from the queue, if the tabs are showing. Pure. */
function promote(state: State, now: number): State {
  if (state.current || !state.hostActive || state.queue.length === 0) return state;
  const fresh = state.queue.filter((q) => !q.enqueuedAway || now - q.enqueuedAt <= MAX_AWAY_AGE_MS);
  const [head, ...rest] = fresh;
  return { ...state, current: head ?? null, queue: rest };
}

// One reducer, so enqueueing and promoting can never interleave and lose a message.
function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "show": {
      const { message, now } = action;
      if (state.current?.id === message.id || state.queue.some((q) => q.id === message.id)) return state;
      const entry: SnackbarEntry = {
        ...message,
        key: state.nextKey,
        enqueuedAt: now,
        enqueuedAway: !state.hostActive,
      };
      const queue = [...state.queue, entry].sort(byPriorityThenAge);
      while (queue.length > MAX_QUEUED) {
        const worst = queue.reduce((w, e) =>
          e.priority > w.priority || (e.priority === w.priority && e.key < w.key) ? e : w
        );
        queue.splice(queue.indexOf(worst), 1);
      }
      return promote({ ...state, queue, nextKey: state.nextKey + 1 }, now);
    }
    case "dismiss": {
      if (!state.current || (action.key !== undefined && state.current.key !== action.key)) return state;
      return promote({ ...state, current: null }, action.now);
    }
    case "host": {
      if (!action.active) {
        // A stack screen covered the tabs: dismiss what's visible, keep the queue.
        return { ...state, hostActive: false, current: null };
      }
      // Messages still queued from before leaving are no longer "away" once back.
      return promote({ ...state, hostActive: true }, action.now);
    }
    case "background":
      return { ...state, current: null, queue: [] };
  }
}

const SnackbarContext = createContext<SnackbarContextValue | null>(null);
const SnackbarHostContext = createContext<SnackbarHostValue | null>(null);

export function SnackbarProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { current: null, queue: [], hostActive: false, nextKey: 1 });
  const [screenReader, setScreenReader] = useState(false);
  const { current } = state;
  const idle = current === null && state.queue.length === 0;

  const show = useCallback(
    (message: SnackbarMessage) => dispatch({ type: "show", message, now: Date.now() }),
    []
  );
  const dismiss = useCallback(() => dispatch({ type: "dismiss", now: Date.now() }), []);
  const setHostActive = useCallback(
    (active: boolean) => dispatch({ type: "host", active, now: Date.now() }),
    []
  );

  // Auto-dismiss. Keyed, so a late timer can never dismiss a newer message.
  const currentKey = current?.key;
  const currentDuration = current?.duration;
  useEffect(() => {
    if (currentKey === undefined || currentDuration === undefined) return;
    const timer = setTimeout(
      () => dispatch({ type: "dismiss", key: currentKey, now: Date.now() }),
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
      dispatch({ type: "dismiss", key: currentKey, now: Date.now() });
      return true;
    });
    return () => sub.remove();
  }, [currentKey]);

  // Backgrounding dismisses the visible message and clears the queue.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (appState) => {
      if (appState === "background") dispatch({ type: "background" });
    });
    return () => sub.remove();
  }, []);

  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    AccessibilityInfo.isScreenReaderEnabled()
      .then((on) => {
        if (mounted.current) setScreenReader(on);
      })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener("screenReaderChanged", setScreenReader);
    return () => {
      mounted.current = false;
      sub.remove();
    };
  }, []);

  const api = useMemo(() => ({ show, dismiss }), [show, dismiss]);
  const host = useMemo(() => ({ current, idle, setHostActive, dismiss }), [current, idle, setHostActive, dismiss]);

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
