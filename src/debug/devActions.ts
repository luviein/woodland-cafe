import type { LocationId } from '../data/locations';
import type { GameState } from '../logic/gameState';
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
  /** Floor running: describe the day clock, e.g. "Day 2, 10:40 (open)". */
  dayTime: (() => string) | null;
  /** Floor running: jump to closing time. */
  endDay: (() => void) | null;
  /** Any time: read and replace the central game state (for `stock`, `leaves`). */
  game: { get: () => GameState; set: (state: GameState) => void } | null;
  /** Any time: stop whatever is running and open a place, or the world map. */
  goto: ((place: LocationId | 'map') => void) | null;
  /** Any time: write the save slot now, or empty it. */
  save: { now: () => void; wipe: () => void } | null;
}

/** Nothing registered: every scene-specific command says "not available". */
export function noDevActions(): DevActions {
  return { serve: null, setMessy: null, dayTime: null, endDay: null, game: null, goto: null, save: null };
}

export const devActions: DevActions = noDevActions();
