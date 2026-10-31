import { FLOOR_CONFIG, type FloorConfig } from '../data/floorConfig';
import { messySeatsAt, takeOrder, type FloorState, type TakeOrderResult } from './floor';
import { pointKey, samePoint, type Layout, type Point, type Table } from './layout';
import type { Owned } from './orders';
import { findPathNextTo } from './pathfinding';
import type { Rng } from './random';
import type { Pantry } from './stock';
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
  /** At most one job at a time: cleaning OR taking an order (or neither). */
  cleaning: CleaningTask | null;
  /** Heading to (or waiting at) the counter spot to take the front customer's order. */
  takingOrder: boolean;
}

export function createPlayer(layout: Layout): PlayerState {
  return { walker: createWalker(layout.counterSpot), cleaning: null, takingOrder: false };
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
 *   - the order spot while someone is queuing (i.e. tapping the front
 *     customer): walk behind the counter and take their order
 *   - a table with any mess (or one of its seats): walk next to it and wipe
 *     every mess on it right now (1 mess = cleanSeconds, 2 = twice that)
 *   - anywhere walkable: walk there (and drop any job)
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
  // Orders are taken from behind the counter, never from the customer's
  // side, so the player always walks to the counter spot first.
  if (samePoint(tile, layout.orderSpot) && floor.queue.length > 0) {
    const walker = walkTo(player.walker, layout, layout.counterSpot);
    if (walker === player.walker) return player; // can't reach the counter
    return { walker, cleaning: null, takingOrder: true };
  }

  const table = tableAt(layout, tile);
  const messes = table ? messySeatsAt(floor, table) : [];
  if (table && messes.length > 0) {
    const walker = redirect(player.walker, (from) => findPathNextTo(layout, from, table.position));
    // redirect() hands back the very same walker only when there's no route.
    // (Already standing next to the table gives a new walker with an empty path.)
    if (walker === player.walker) return player; // can't reach it
    return { walker, cleaning: cleaningTask(table.id, messes, config), takingOrder: false };
  }

  const walker = walkTo(player.walker, layout, tile);
  if (walker === player.walker) return player; // not somewhere you can walk
  // Walking off somewhere else drops the current job: that's how you cancel.
  return { walker, cleaning: null, takingOrder: false };
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
  const { cleaning, cleanedSeats } = workOnCleaning(player.cleaning, walker, floor, seconds);
  return { player: { ...player, walker, cleaning }, cleanedSeats };
}

/** A new job wiping `seats` at a table: cleanSeconds per mess. Shared with the Cleaner (cleaner.ts). */
export function cleaningTask(tableId: string, seats: Point[], config: FloorConfig = FLOOR_CONFIG): CleaningTask {
  const totalSeconds = config.cleanSeconds * seats.length;
  return { tableId, seats, secondsLeft: totalSeconds, totalSeconds };
}

/**
 * `seconds` of work on a cleaning job, for whoever is doing it: the player
 * or the Cleaner. `walker` has already moved this frame. Returns the job
 * left (null once done or no longer needed) and the seats wiped, if any.
 */
export function workOnCleaning(
  cleaning: CleaningTask | null,
  walker: Walker,
  floor: FloorState,
  seconds: number,
): { cleaning: CleaningTask | null; cleanedSeats: Point[] } {
  // Already clean (someone else wiped it, or a dev command)? Nothing left to do.
  const stillMessy = (s: Point) => floor.messySeats.includes(pointKey(s));
  if (!cleaning || !cleaning.seats.some(stillMessy)) return { cleaning: null, cleanedSeats: [] };
  // Wiping only happens once they've arrived next to the table.
  if (isMoving(walker)) return { cleaning, cleanedSeats: [] };
  const secondsLeft = cleaning.secondsLeft - seconds;
  if (secondsLeft <= 0) return { cleaning: null, cleanedSeats: cleaning.seats };
  return { cleaning: { ...cleaning, secondsLeft }, cleanedSeats: [] };
}

/**
 * Once the player is standing at the counter spot with an order to take,
 * takes it. Returns what happened (null = nothing this frame):
 *   - the front customer is still walking up (or still being served):
 *     keep waiting (null)
 *   - 'ordered', 'noSeat' or 'outOfStock': the job is done either way; tap again to retry
 *   - the queue emptied (they gave up): the job is dropped (null)
 * Unlike stepPlayer, this does return a new floor: taking an order is the
 * floor's rule (takeOrder), the player just decides WHEN it happens.
 */
export function takeOrderAtCounter(
  player: PlayerState,
  floor: FloorState,
  layout: Layout,
  game: Owned & Pantry,
  rng: Rng = Math.random,
): { player: PlayerState; floor: FloorState; result: TakeOrderResult | null } {
  const unchanged = { player, floor, result: null };
  if (!player.takingOrder || isMoving(player.walker)) return unchanged;

  const done = { ...player, takingOrder: false };
  if (floor.queue.length === 0) return { ...unchanged, player: done };

  const taken = takeOrder(floor, layout, game, rng);
  if (taken.result === 'notReady') return unchanged;
  return { player: done, floor: taken.floor, result: taken.result };
}

/** 0..1 for the progress bar; null when not actively wiping. Works for the Cleaner too. */
export function cleaningProgress(worker: { walker: Walker; cleaning: CleaningTask | null }): number | null {
  if (!worker.cleaning || isMoving(worker.walker)) return null;
  return 1 - worker.cleaning.secondsLeft / worker.cleaning.totalSeconds;
}
