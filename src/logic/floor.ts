import { FLOOR_CONFIG, type FloorConfig } from '../data/floorConfig';
import { isWalkable, neighbours, samePoint, type Layout, type Point } from './layout';
import { findPath } from './pathfinding';
import type { Rng } from './random';
import {
  createWalker,
  destination,
  isMoving,
  redirect,
  routeStart,
  stepWalker,
  walkTo,
  type Walker,
} from './walker';

/**
 * Where a customer is in their visit. Each phase ends on a clear event:
 *   toCounter      -> reached the order spot
 *   ordering       -> timer ran out (stand-in for real ordering, milestone 3)
 *   waitingForSeat -> got a seat (front of the line), or ran out of patience
 *   toSeat         -> sat down (or the table got messy: back to the line)
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
  /** Seconds left in a timed phase (ordering, waitingForSeat, eating). */
  timer: number;
  /** The seat this customer has claimed, from heading to it until leaving it. */
  seat: SeatRef | null;
  /** True if they gave up waiting and are leaving unhappy. */
  upset: boolean;
}

/**
 * Everything that changes on the floor, as plain data: no Phaser objects, so
 * it can be tested, and later saved as part of the central game state.
 */
export interface FloorState {
  customers: Customer[];
  /** Keyed by table id. */
  dirtyTables: Record<string, boolean>;
  /** Ids of customers waiting for a seat; [0] is the front of the line. */
  waitingLine: number[];
  /** Seconds until the next customer arrives. */
  spawnTimer: number;
  nextCustomerId: number;
}

export function createFloorState(layout: Layout, config: FloorConfig = FLOOR_CONFIG): FloorState {
  return {
    customers: [],
    dirtyTables: Object.fromEntries(layout.tables.map((t) => [t.id, false])),
    waitingLine: [],
    spawnTimer: config.firstCustomerDelay,
    nextCustomerId: 1,
  };
}

const between = (min: number, max: number, rng: Rng): number => min + rng() * (max - min);

/**
 * Advances the floor by `seconds`. Returns a NEW state; the old one is left
 * untouched (same reasons as stepWalker: easy to test, no shared-object bugs).
 *
 * Works in passes, because the waiting line needs to see everyone at once:
 *   1. move everyone and count down their timers
 *   2. maybe let a new customer in
 *   3. each customer reacts to their own situation (arrived? timer done?)
 *   4. seat people from the front of the line, then shuffle the line up
 *   5. drop customers who walked out the door
 *
 * Simplification for this milestone: a new customer only comes in when nobody
 * else is ordering, so only one person is ever at the order spot.
 * Milestone 3 replaces this with a proper counter queue.
 */
export function stepFloor(
  state: FloorState,
  layout: Layout,
  seconds: number,
  rng: Rng = Math.random,
  config: FloorConfig = FLOOR_CONFIG,
): FloorState {
  const dirtyTables = { ...state.dirtyTables };
  const line = [...state.waitingLine];
  let { spawnTimer, nextCustomerId } = state;

  // 1. Fresh copies we're free to change; the input state stays untouched.
  const customers: Customer[] = state.customers.map((c) => ({
    ...c,
    walker: stepWalker(c.walker, seconds, config.customerSpeed),
    timer: c.timer - seconds,
  }));

  // 2. Maybe a new customer walks in: only if nobody is ordering and there's
  // room in the line for them if no seat is free.
  spawnTimer -= seconds;
  const someoneOrdering = customers.some((c) => c.phase === 'toCounter' || c.phase === 'ordering');
  if (spawnTimer <= 0 && !someoneOrdering && line.length < layout.waitingLine.length) {
    customers.push({
      id: nextCustomerId++,
      walker: walkTo(createWalker(layout.door), layout, layout.orderSpot),
      phase: 'toCounter',
      timer: 0,
      seat: null,
      upset: false,
    });
    spawnTimer = between(config.spawnIntervalMin, config.spawnIntervalMax, rng);
  }

  const joinLine = (c: Customer, where: 'front' | 'back'): void => {
    c.phase = 'waitingForSeat';
    c.seat = null;
    c.timer = config.seatWaitSeconds;
    if (where === 'front') line.unshift(c.id);
    else line.push(c.id);
  };

  const leave = (c: Customer, upset: boolean): void => {
    c.phase = 'leaving';
    c.seat = null;
    c.upset = upset;
    c.walker = walkTo(c.walker, layout, layout.door);
    const inLine = line.indexOf(c.id);
    if (inLine >= 0) line.splice(inLine, 1);
  };

  // 3. Each customer reacts to their own situation.
  const walkedOut = new Set<number>();
  for (const c of customers) {
    const arrived = !isMoving(c.walker);
    switch (c.phase) {
      case 'toCounter':
        if (arrived) {
          c.phase = 'ordering';
          c.timer = config.orderSeconds;
        }
        break;

      case 'ordering':
        if (c.timer > 0) break;
        // Only take a seat directly if nobody is already waiting; otherwise
        // that would be skipping the line.
        if (line.length > 0 || !claimSeat(c, customers, layout, dirtyTables)) {
          joinLine(c, 'back');
        }
        break;

      case 'waitingForSeat':
        if (c.timer <= 0) leave(c, true); // waited too long
        break;

      case 'toSeat':
        // Customers never go to a dirty table. If someone else at their table
        // just left a mess, they go back to the FRONT of the line (they'd
        // already been given a seat), and get first pick of the next one.
        // Checked before "arrived" so they never sit at a messy table.
        if (dirtyTables[c.seat!.tableId]) joinLine(c, 'front');
        else if (arrived) {
          c.phase = 'eating';
          c.timer = between(config.eatSecondsMin, config.eatSecondsMax, rng);
        }
        break;

      case 'eating':
        if (c.timer <= 0) {
          dirtyTables[c.seat!.tableId] = true; // the mess is left as they stand up
          leave(c, false);
        }
        break;

      case 'leaving':
        if (arrived) walkedOut.add(c.id);
        break;
    }
  }

  // 4. First come, first served: seat from the front while seats are free,
  // then everyone still waiting walks to their spot in the line.
  const byId = (id: number): Customer => customers.find((c) => c.id === id)!;
  while (line.length > 0 && claimSeat(byId(line[0]), customers, layout, dirtyTables)) {
    line.shift();
  }
  const lastSpot = layout.waitingLine.length - 1;
  line.forEach((id, i) => {
    const c = byId(id);
    // If more people are waiting than there are spots (possible when someone
    // is sent back from a messy table), the extras crowd the last spot.
    const spot = layout.waitingLine[Math.min(i, lastSpot)];
    if (!samePoint(destination(c.walker), spot)) c.walker = walkTo(c.walker, layout, spot);
  });

  // 5. Out the door.
  return {
    customers: customers.filter((c) => !walkedOut.has(c.id)),
    dirtyTables,
    waitingLine: line,
    spawnTimer,
    nextCustomerId,
  };
}

/**
 * Gives `c` the nearest free seat at a clean table and sends them to it.
 * Returns false (and changes nothing) if there's no such seat.
 */
function claimSeat(
  c: Customer,
  everyone: readonly Customer[],
  layout: Layout,
  dirtyTables: Record<string, boolean>,
): boolean {
  const others = everyone.filter((o) => o.id !== c.id);
  const seat = findFreeSeat(layout, dirtyTables, others, routeStart(c.walker));
  if (!seat) return false;
  c.seat = seat;
  c.walker = redirect(c.walker, (from) => routeToSeat(layout, from, seat.seat));
  c.phase = 'toSeat';
  return true;
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
