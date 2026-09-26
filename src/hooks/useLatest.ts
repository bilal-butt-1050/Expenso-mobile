import { useRef } from "react";

/**
 * A ref that always holds the latest value. For an effect that must *read* a value (a callback prop,
 * or state the effect itself sets) without re-running whenever it changes (rn-review 2.3, ui-review
 * 7.3). Depending on such a value directly would restart the effect's animation on every parent
 * re-render, or re-run the effect in response to its own state change.
 */
export function useLatest<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}
