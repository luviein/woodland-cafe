import { FORAGE_CONFIG, FORAGE_SPOTS, type ForageConfig, type ForageSpotDef } from '../data/forageSpots';
import type { OutdoorLocationId } from '../data/outdoorAreas';
import type { GameState } from './gameState';
import type { Point } from './layout';
import type { Mover } from './outdoor';

/** The player stands this far below a spot to gather it: in front, so they're drawn over it. */
const STAND_BELOW = 12;

export function spotsAt(location: OutdoorLocationId, spots: readonly ForageSpotDef[] = FORAGE_SPOTS): ForageSpotDef[] {
  return spots.filter((s) => s.location === location);
}

/** Where the player walks to gather `spot`. */
export function standPoint(spot: ForageSpotDef): Point {
  return { x: spot.position.x, y: spot.position.y + STAND_BELOW };
}

export function gatheredToday(state: GameState, spot: ForageSpotDef): boolean {
  return state.foragedToday.includes(spot.id);
}

/**
 * Gathers `spot`: its ingredient goes into stock and it's bare until
 * tomorrow. Does nothing if it was already gathered today.
 */
export function forage(state: GameState, spot: ForageSpotDef): GameState {
  if (gatheredToday(state, spot)) return state;
  return {
    ...state,
    stock: { ...state.stock, [spot.ingredient]: state.stock[spot.ingredient] + spot.amount },
    foragedToday: [...state.foragedToday, spot.id],
  };
}

/** The player is gathering a spot: walking to it, then working on it. */
export interface Gathering {
  spotId: string;
  /** Seconds of work left once standing there. */
  secondsLeft: number;
}

export function startGathering(spot: ForageSpotDef, config: ForageConfig = FORAGE_CONFIG): Gathering {
  return { spotId: spot.id, secondsLeft: config.forageSeconds };
}

/**
 * Work only happens once the player has arrived (like cleaning a table).
 * Returns the gathering still going (null when done) and whether it just
 * finished this step.
 */
export function stepGathering(
  gathering: Gathering,
  mover: Mover,
  seconds: number,
): { gathering: Gathering | null; finished: boolean } {
  if (mover.target) return { gathering, finished: false }; // still walking there
  const secondsLeft = gathering.secondsLeft - seconds;
  if (secondsLeft <= 0) return { gathering: null, finished: true };
  return { gathering: { ...gathering, secondsLeft }, finished: false };
}

/** 0..1 for the progress bar; null while still walking there. */
export function gatheringProgress(
  gathering: Gathering,
  mover: Mover,
  config: ForageConfig = FORAGE_CONFIG,
): number | null {
  if (mover.target) return null;
  return 1 - gathering.secondsLeft / config.forageSeconds;
}
