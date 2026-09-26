import type { SnackbarMessage } from "./snackbarQueue";

/**
 * Lets code outside React (mutation defaults replaying offline writes) show a snackbar. The
 * provider registers its `show` on mount. Before that, messages wait here and are delivered on
 * registration, so a replay that fails during startup is still reported.
 */
let sink: ((message: SnackbarMessage) => void) | null = null;
const pending: SnackbarMessage[] = [];

export function registerSnackbarSink(show: ((message: SnackbarMessage) => void) | null) {
  sink = show;
  if (show) pending.splice(0).forEach(show);
}

export function showSnackbar(message: SnackbarMessage) {
  if (sink) sink(message);
  else pending.push(message);
}
