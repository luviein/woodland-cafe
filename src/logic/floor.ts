import { FLOOR_CONFIG, type FloorConfig } from '../data/floorConfig';
import { isWalkable, neighbours, samePoint, type Layout, type Point } from './layout';
import { findPath } from './pathfinding';
import type { Rng } from './random';
import { createWalker, isMoving, redirect, routeStart, stepWalker, walkTo, type Walker } from './walker';

/**
 * Where a customer is in their visit. Each phase ends on a clear event:
 *   toCounter      -> reached the order spot
 *   ordering       -> timer ran out (stand-in for real ordering, milestone 3)
 *   waitingForSeat -> a seat at a clean table came free
 *   toSeat         -> sat down
 *   eating         -> timer ran out; stands up and leaves a mess
 *   leaving        -> reached the door and is removed
 */
export type CustomerPhase =
  | 'toCounter'
  | 'ordering'
  | 'waitingForSeat'
  | 'toSeat'
  | 'eating'
  | 'leaving';

export interface SeatRef {
  tableId: string;
  seat: Point;
}

export interface Customer {
  id: number;
  walker: Walker;
  phase: CustomerPhase;
  /** Seconds left in a timed phase (ordering, eating). */
  timer: number;
  /** The seat this customer has claimed, from heading to it until leaving it. */
  seat: SeatRef | null;
}

/**
 * Everything that changes on the floor, as plain data: no Phaser objects, so
 * it can be tested, and later saved as part of the central game state.
 */
export interface FloorState {
  customers: Customer[];
  /** Keyed by table id. */
  dirtyTables: Record<string, boolean>;
  /** Seconds until the next customer arrives. */
  spawnTimer: number;
  nextCustomerId: number;
}

export function createFloorState(layout: Layout, config: FloorConfig = FLOOR_CONFIG): FloorState {
  return {
    customers: [],
    dirtyTables: Object.fromEntries(layout.tables.map((t) => [t.id, false])),
    spawnTimer: config.firstCustomerDelay,
    nextCustomerId: 1,
  };
}

const between = (min: number, max: number, rng: Rng): number => min + rng() * (max - min);

/** Phases that keep someone at, or on the way to, the counter. */
const AT_COUNTER: readonly CustomerPhase[] = ['toCounter', 'ordering', 'waitingForSeat'];

/**
 * Advances the floor by `seconds`. Returns a NEW state; the old one is left
 * untouched (same reasons as stepWalker: easy to test, no shared-object bugs).
 *
 * Simplification for this milestone: a new customer only comes in when nobody
 * is ordering or waiting for a seat, so the counter never gets crowded.
 * Milestone 3 replaces this with a proper queue.
 */
export function stepFloor(
  state: FloorState,
  layout: Layout,
  seconds: number,
  rng: Rng = Math.random,
  config: FloorConfig = FLOOR_CONFIG,
): FloorState {
  const dirtyTables = { ...state.dirtyTables };
  let { spawnTimer, nextCustomerId } = state;
  let customers = [...state.customers];

  // 1. Maybe a new customer walks in.
  spawnTimer -= seconds;
  const counterBusy = customers.some((c) => AT_COUNTER.includes(c.phase));
  if (spawnTimer <= 0 && !counterBusy) {
    customers.push({
      id: nextCustomerId++,
      walker: walkTo(createWalker(layout.door), layout, layout.orderSpot),
      phase: 'toCounter',
      timer: 0,
      seat: null,
    });
    spawnTimer = between(config.spawnIntervalMin, config.spawnIntervalMax, rng);
  }

  // 2. Update each customer. Done one at a time, in order, so a seat claimed
  // by an earlier customer this frame is already taken for the next one.
  const updated: Customer[] = [];
  for (let i = 0; i < customers.length; i++) {
    const old = customers[i];
    const c: Customer = {
      ...old,
      walker: stepWalker(old.walker, seconds, config.customerSpeed),
      timer: old.timer - seconds,
    };
    const arrived = !isMoving(c.walker);

    /** Claims the nearest free seat at a clean table and heads there. False if none. */
    const tryToSeat = (): boolean => {
      // Everyone else: those already updated this frame, plus those still to come.
      const others = [...updated, ...customers.slice(i + 1)];
      const seat = findFreeSeat(layout, dirtyTables, others, routeStart(c.walker));
      if (!seat) return false;
      c.seat = seat;
      c.walker = redirect(c.walker, (from) => routeToSeat(layout, from, seat.seat));
      c.phase = 'toSeat';
      return true;
    };

    switch (c.phase) {
      case 'toCounter':
        if (arrived) {
          c.phase = 'ordering';
          c.timer = config.orderSeconds;
        }
        break;

      case 'ordering':
        if (c.timer > 0) break;
        if (!tryToSeat()) c.phase = 'waitingForSeat'; // stays at the counter until a table is cleaned
        break;

      case 'waitingForSeat':
        tryToSeat(); // keeps checking every frame until a seat frees up
        break;

      case 'toSeat':
        // Customers never go to a dirty table. If someone else at their table
        // just left a mess, give up the seat and find another, or head back to
        // the counter to wait. Checked before "arrived" so they never sit down.
        if (dirtyTables[c.seat!.tableId]) {
          c.seat = null;
          if (!tryToSeat()) {
            c.walker = walkTo(c.walker, layout, layout.orderSpot);
            c.phase = 'waitingForSeat';
          }
          break;
        }
        if (arrived) {
          c.phase = 'eating';
          c.timer = between(config.eatSecondsMin, config.eatSecondsMax, rng);
        }
        break;

      case 'eating':
        if (c.timer <= 0) {
          dirtyTables[c.seat!.tableId] = true; // the mess is left as they stand up
          c.seat = null;
          c.walker = walkTo(c.walker, layout, layout.door);
          c.phase = 'leaving';
        }
        break;

      case 'leaving':
        if (arrived) continue; // out the door: drop them from the list
        break;
    }
    updated.push(c);
  }
  customers = updated;

  return { customers, dirtyTables, spawnTimer, nextCustomerId };
}

/**
 * A seat that's at a clean table and not claimed by anyone, closest to
 * `from`. Null if every clean seat is taken (or every table is dirty).
 */
export function findFreeSeat(
  layout: Layout,
  dirtyTables: Record<string, boolean>,
  others: readonly Customer[],
  from: Point,
): SeatRef | null {
  let best: SeatRef | null = null;
  let bestSteps = Infinity;
  for (const table of layout.tables) {
    if (dirtyTables[table.id]) continue;
    for (const seat of table.seats) {
      if (others.some((o) => o.seat && samePoint(o.seat.seat, seat))) continue;
      const route = routeToSeat(layout, from, seat);
      if (route && route.length < bestSteps) {
        best = { tableId: table.id, seat };
        bestSteps = route.length;
      }
    }
  }
  return best;
}

/**
 * Seats aren't walkable (nobody should walk THROUGH a chair), so the route is:
 * walk to the best floor tile next to the seat, then step onto it.
 */
function routeToSeat(layout: Layout, from: Point, seat: Point): Point[] | null {
  let best: Point[] | null = null;
  for (const n of neighbours(seat)) {
    if (!isWalkable(layout, n)) continue;
    const route = findPath(layout, from, n);
    if (route && (!best || route.length < best.length)) best = route;
  }
  return best && [...best, seat];
}
