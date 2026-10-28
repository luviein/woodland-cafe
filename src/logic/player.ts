import { FLOOR_CONFIG, type FloorConfig } from '../data/floorConfig';
import { messySeatsAt, type FloorState } from './floor';
import { pointKey, samePoint, type Layout, type Point, type Table } from './layout';
import { findPathNextTo } from './pathfinding';
import { createWalker, isMoving, redirect, stepWalker, walkTo, type Walker } from './walker';

/** A table the player has been sent to clean. */
export interface CleaningTask {
  tableId: string;
  /**
   * The messes to wipe: whatever was on the table when the player tapped it.
   * A mess that appears later needs another tap.
   */
  seats: Point[];
  /** Wiping time left. Only counts down once the player is standing next to the table. */
  secondsLeft: number;
  /** Full wiping time for this job (cleanSeconds per mess), for the progress bar. */
  totalSeconds: number;
}

/** The player on the cafe floor, as plain data (like FloorState). */
export interface PlayerState {
  walker: Walker;
  cleaning: CleaningTask | null;
}

export function createPlayer(layout: Layout): PlayerState {
  return { walker: createWalker(layout.playerStart), cleaning: null };
}

/**
 * The table at `tile`, counting its seats too. Seats are part of the target
 * so there's more to tap: easier with a finger on a small screen.
 */
export function tableAt(layout: Layout, tile: Point): Table | null {
  return (
    layout.tables.find(
      (t) => samePoint(t.position, tile) || t.seats.some((s) => samePoint(s, tile)),
    ) ?? null
  );
}

/**
 * What a tap means for the player:
 *   - a table with any mess (or one of its seats): walk next to it and wipe
 *     every mess on it right now (1 mess = cleanSeconds, 2 = twice that)
 *   - anywhere walkable: walk there (and stop any cleaning)
 *   - anything else (walls, clean tables...): ignored
 * Returns the same object if nothing changes, so callers can tell.
 */
export function tapTile(
  player: PlayerState,
  layout: Layout,
  floor: FloorState,
  tile: Point,
  config: FloorConfig = FLOOR_CONFIG,
): PlayerState {
  const table = tableAt(layout, tile);
  const messes = table ? messySeatsAt(floor, table) : [];
  if (table && messes.length > 0) {
    const walker = redirect(player.walker, (from) => findPathNextTo(layout, from, table.position));
    // redirect() hands back the very same walker only when there's no route.
    // (Already standing next to the table gives a new walker with an empty path.)
    if (walker === player.walker) return player; // can't reach it
    const totalSeconds = config.cleanSeconds * messes.length;
    return {
      walker,
      cleaning: { tableId: table.id, seats: messes, secondsLeft: totalSeconds, totalSeconds },
    };
  }

  const walker = walkTo(player.walker, layout, tile);
  if (walker === player.walker) return player; // not somewhere you can walk
  // Walking off somewhere else drops the cleaning job: that's how you cancel.
  return { walker, cleaning: null };
}

/**
 * Moves the player and works on any cleaning job. Returns the new player and
 * the seats wiped this frame (usually none). The caller applies those to the
 * floor with cleanSeats(): the player module never edits the floor itself,
 * which keeps each module in charge of its own data.
 */
export function stepPlayer(
  player: PlayerState,
  floor: FloorState,
  seconds: number,
  config: FloorConfig = FLOOR_CONFIG,
): { player: PlayerState; cleanedSeats: Point[] } {
  const walker = stepWalker(player.walker, seconds, config.playerSpeed);
  let cleaning = player.cleaning;

  // Already clean (e.g. a dev command did it)? Nothing left to do.
  const stillMessy = (s: Point) => floor.messySeats.includes(pointKey(s));
  if (cleaning && !cleaning.seats.some(stillMessy)) cleaning = null;

  // Wiping only happens once the player has arrived next to the table.
  if (cleaning && !isMoving(walker)) {
    const secondsLeft = cleaning.secondsLeft - seconds;
    if (secondsLeft <= 0) {
      return { player: { walker, cleaning: null }, cleanedSeats: cleaning.seats };
    }
    cleaning = { ...cleaning, secondsLeft };
  }
  return { player: { walker, cleaning }, cleanedSeats: [] };
}

/** 0..1 for the progress bar; null when not actively wiping. */
export function cleaningProgress(player: PlayerState): number | null {
  if (!player.cleaning || isMoving(player.walker)) return null;
  return 1 - player.cleaning.secondsLeft / player.cleaning.totalSeconds;
}
