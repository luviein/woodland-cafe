import type { Score } from '../logic/types';

/**
 * Shortcuts that only make sense while a certain scene is running. Each
 * scene fills its entry in on create() and clears it on shutdown, so a
 * command can tell "not available right now" (null) from "done".
 *
 * Like devSettings, a single shared object: a testing tool, not game state.
 */
export interface DevActions {
  /** Prep station open: serve the current order as if it scored `score`. */
  serve: ((score: Score) => void) | null;
  /** Floor running: mess up every free seat (true) or wipe every mess (false). Returns how many changed. */
  setMessy: ((messy: boolean) => number) | null;
}

export const devActions: DevActions = { serve: null, setMessy: null };
