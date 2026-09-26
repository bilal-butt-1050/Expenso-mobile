import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { AccessibilityInfo, AppState, BackHandler } from "react-native";
import { SnackbarEntry, SnackbarMessage, initialState, reducer } from "./snackbarQueue";
import { registerSnackbarSink } from "./snackbarBridge";

export type { SnackbarAction, SnackbarEntry, SnackbarMessage } from "./snackbarQueue";

/**
 * One app-wide snackbar (DESIGN §S3). One message is visible at a time. It is rendered by
 * `SnackbarHost` inside the tab navigator, so it only ever appears over tab screens.
 *
 * Undo messages (S-1) carry `onExpire`: the deferred action (committing a delete) runs when the
 * message ends any way *except* its action being tapped: timeout, Android back, the app going to the
 * background, or a stack screen covering the tabs (DESIGN §S3 lifecycle).
 */

interface SnackbarContextValue {
  show: (message: SnackbarMessage) => void;
  dismiss: () => void;
}

interface SnackbarHostValue {
  current: SnackbarEntry | null;
  /** Nothing visible and nothing queued. Reactive, so prompts can wait for it. */
  idle: boolean;
  setHostActive: (active: boolean) => void;
  /** The visible message's action was tapped: end it without running its `onExpire`. */
  dismissForAction: () => void;
}

const SnackbarContext = createContext<SnackbarContextValue | null>(null);
const SnackbarHostContext = createContext<SnackbarHostValue | null>(null);

export function SnackbarProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [screenReader, setScreenReader] = useState(false);
  const { current } = state;
  // Side effects stay out of the reducer. `settled` records messages whose onExpire already ran or
  // whose action was tapped, so each onExpire runs exactly once.
  const settled = useRef(new Set<number>());
  const stateRef = useRef(state);
  stateRef.current = state;

  const expire = useCallback((entry: SnackbarEntry | null | undefined) => {
    if (!entry?.onExpire || settled.current.has(entry.key)) return;
    settled.current.add(entry.key);
    entry.onExpire();
  }, []);

  // A message that leaves the screen for any reason other than its action has expired.
  const previous = useRef<SnackbarEntry | null>(null);
  useEffect(() => {
    const prev = previous.current;
    if (prev && prev.key !== current?.key) expire(prev);
    previous.current = current;
  }, [current, expire]);
  const idle = current === null && state.queue.length === 0;

  const show = useCallback(
    (message: SnackbarMessage) => dispatch({ type: "show", message, now: Date.now() }),
    []
  );
  const dismiss = useCallback(() => dispatch({ type: "dismiss", now: Date.now() }), []);
  const dismissForAction = useCallback(() => {
    const visible = stateRef.current.current;
    if (visible) settled.current.add(visible.key);
    dispatch({ type: "dismiss", key: visible?.key, now: Date.now() });
  }, []);
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

  // Backgrounding dismisses the visible message and clears the queue. A pending undo commits right
  // here, synchronously, because the OS may suspend or kill the app before another render (R-4).
  useEffect(() => {
    const sub = AppState.addEventListener("change", (appState) => {
      if (appState !== "background") return;
      expire(stateRef.current.current);
      stateRef.current.queue.forEach(expire);
      dispatch({ type: "background" });
    });
    return () => sub.remove();
  }, [expire]);

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

  // Mutation defaults report failed offline replays from outside React.
  useEffect(() => {
    registerSnackbarSink(show);
    return () => registerSnackbarSink(null);
  }, [show]);

  const api = useMemo(() => ({ show, dismiss }), [show, dismiss]);
  const host = useMemo(
    () => ({ current, idle, setHostActive, dismissForAction }),
    [current, idle, setHostActive, dismissForAction]
  );

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
