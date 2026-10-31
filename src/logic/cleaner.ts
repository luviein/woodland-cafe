import { FLOOR_CONFIG, type FloorConfig } from '../data/floorConfig';
import { messySeatsAt, type FloorState } from './floor';
import { isWalkable, neighbours, pointKey, samePoint, type Layout, type Point, type Table } from './layout';
import { findPathNextTo } from './pathfinding';
import { cleaningTask, workOnCleaning, type CleaningTask } from './player';
import { createWalker, destination, redirect, routeStart, stepWalker, walkTo, type Walker } from './walker';

// The hired Cleaner (GAME_DESIGN.md §5.8): wipes messes on their own, using
// the same wiping rules as the player (player.ts workOnCleaning), so a mess
// takes cleanSeconds whoever wipes it.

/** The Cleaner on the cafe floor, as plain data (like PlayerState). */
export interface CleanerState {
  walker: Walker;
  cleaning: CleaningTask | null;
}

/**
 * Where the Cleaner waits with nothing to do: the floor tile just inside
 * the door, out of the way of the counter.
 */
export function cleanerHome(layout: Layout): Point {
  const inside = neighbours(layout.door).find((p) => layout.tiles[p.y]?.[p.x] === 'floor');
  return inside ?? layout.door;
}

export function createCleaner(layout: Layout): CleanerState {
  return { walker: createWalker(cleanerHome(layout)), cleaning: null };
}

/**
 * The messy table closest to `from` (by walking distance) that the Cleaner
 * may take: not `skipTableId` (the player's). Null if there's none they can reach.
 */
function nearestMessyTable(
  floor: FloorState,
  layout: Layout,
  from: Point,
  skipTableId: string | null,
): { table: Table; seats: Point[] } | null {
  let best: { table: Table; seats: Point[] } | null = null;
  let bestSteps = Infinity;
  for (const table of layout.tables) {
    if (table.id === skipTableId) continue;
    const seats = messySeatsAt(floor, table);
    if (seats.length === 0) continue;
    const route = findPathNextTo(layout, from, table.position);
    if (route && route.length < bestSteps) {
      best = { table, seats };
      bestSteps = route.length;
    }
  }
  return best;
}

/**
 * One frame of the Cleaner's day:
 *   - the table they're heading to became the player's (`playerTableId`):
 *     leave it to the player and pick another
 *   - no job: head for the nearest messy table, or back home if all is clean
 *   - then walk, and wipe once next to the table
 * Like stepPlayer, the floor isn't changed here: the caller applies the
 * returned `cleanedSeats` with cleanSeats().
 */
export function stepCleaner(
  cleaner: CleanerState,
  floor: FloorState,
  layout: Layout,
  playerTableId: string | null,
  seconds: number,
  config: FloorConfig = FLOOR_CONFIG,
): { cleaner: CleanerState; cleanedSeats: Point[] } {
  let { walker, cleaning } = cleaner;
  if (cleaning && cleaning.tableId === playerTableId) cleaning = null;
  // Wiped by someone else already: free to pick another.
  if (cleaning && !cleaning.seats.some((s) => floor.messySeats.includes(pointKey(s)))) cleaning = null;

  if (!cleaning) {
    const job = nearestMessyTable(floor, layout, routeStart(walker), playerTableId);
    if (job) {
      walker = redirect(walker, (from) => findPathNextTo(layout, from, job.table.position));
      cleaning = cleaningTask(job.table.id, job.seats, config);
    } else {
      const home = cleanerHome(layout);
      if (!samePoint(destination(walker), home) && isWalkable(layout, home)) walker = walkTo(walker, layout, home);
    }
  }

  walker = stepWalker(walker, seconds, config.cleanerSpeed);
  const worked = workOnCleaning(cleaning, walker, floor, seconds);
  return { cleaner: { walker, cleaning: worked.cleaning }, cleanedSeats: worked.cleanedSeats };
}
