import type { ComponentProps } from "react";
import type { MaterialCommunityIcons } from "@expo/vector-icons";

/**
 * The snackbar's queue as a pure reducer (DESIGN §S3). No React Native imports, so it can be tested
 * in plain Node. The provider in SnackbarContext.tsx owns every side effect.
 */

type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

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
  /**
   * Runs exactly once when the message ends without its action being tapped. Makes it an undo
   * message: it pre-empts others (queue rules 2 and 3) and is never dropped.
   */
  onExpire?: () => void;
}

export interface SnackbarEntry extends SnackbarMessage {
  key: number;
  enqueuedAt: number;
  /** Queued while a stack screen covered the tabs. Only these age out (lifecycle table). */
  enqueuedAway: boolean;
}



/** A message queued while away is dropped if the tabs come back later than this. */
const MAX_AWAY_AGE_MS = 10_000;
/** Queued messages beyond this are dropped, lowest priority and oldest first (rule 4). */
const MAX_QUEUED = 3;

export interface State {
  current: SnackbarEntry | null;
  queue: SnackbarEntry[];
  hostActive: boolean;
  nextKey: number;
}

export type Action =
  | { type: "show"; message: SnackbarMessage; now: number }
  | { type: "dismiss"; key?: number; now: number }
  | { type: "host"; active: boolean; now: number }
  | { type: "background" };

function byPriorityThenAge(a: SnackbarEntry, b: SnackbarEntry) {
  return a.priority - b.priority || a.key - b.key;
}

/** Drop the lowest-priority, oldest droppable entries beyond the cap. Undo entries are never dropped. */
function capQueue(queue: SnackbarEntry[]): SnackbarEntry[] {
  const next = [...queue];
  while (next.filter((e) => !e.onExpire).length > MAX_QUEUED) {
    const worst = next
      .filter((e) => !e.onExpire)
      .reduce((w, e) => (e.priority > w.priority || (e.priority === w.priority && e.key < w.key) ? e : w));
    next.splice(next.indexOf(worst), 1);
  }
  return next;
}

/** Fill the free slot from the queue, if the tabs are showing. Pure. */
function promote(state: State, now: number): State {
  if (state.current || !state.hostActive || state.queue.length === 0) return state;
  const fresh = state.queue.filter((q) => !q.enqueuedAway || now - q.enqueuedAt <= MAX_AWAY_AGE_MS);
  const [head, ...rest] = fresh;
  return { ...state, current: head ?? null, queue: rest };
}

// One reducer, so enqueueing and promoting can never interleave and lose a message.
export function reducer(state: State, action: Action): State {
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
      const nextKey = state.nextKey + 1;

      // An undo shows at once (rules 2 and 3). A visible undo leaves and so commits; any other
      // visible message goes back to the front of the queue, except S-6, which is just dropped.
      if (entry.onExpire && state.hostActive && state.current) {
        const visible = state.current;
        const requeue = visible.onExpire || visible.id === "S-6" ? [] : [visible];
        const queue = capQueue([...requeue, ...state.queue].sort(byPriorityThenAge));
        return { ...state, current: entry, queue, nextKey };
      }

      const queue = capQueue([...state.queue, entry].sort(byPriorityThenAge));
      return promote({ ...state, queue, nextKey }, now);
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

export const initialState: State = { current: null, queue: [], hostActive: false, nextKey: 1 };
