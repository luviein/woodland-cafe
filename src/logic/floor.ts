import { FLOOR_CONFIG, type FloorConfig } from '../data/floorConfig';
import { pointKey, samePoint, type Layout, type Point, type Table } from './layout';
import { findPathNextTo } from './pathfinding';
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
 *   toSeat         -> sat down (or their seat got messy: back to the line)
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
  /**
   * Seats with a mess in front of them, as pointKey() strings ("3,5").
   * Messes are per seat: whoever ate there leaves a mess on their own side.
   * An array (not a Set) because plain arrays save to JSON as-is.
   */
  messySeats: string[];
  /** Ids of customers waiting for a seat; [0] is the front of the line. */
  waitingLine: number[];
  /** Seconds until the next customer arrives. */
  spawnTimer: number;
  nextCustomerId: number;
}

export function createFloorState(config: FloorConfig = FLOOR_CONFIG): FloorState {
  return {
    customers: [],
    messySeats: [],
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
  // A Set for quick "is this seat messy?" checks; turned back into an array at the end.
  const messySeats = new Set(state.messySeats);
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
        if (line.length > 0 || !claimSeat(c, customers, layout, messySeats)) {
          joinLine(c, 'back');
        }
        break;

      case 'waitingForSeat':
        if (c.timer <= 0) leave(c, true); // waited too long
        break;

      case 'toSeat':
        // Customers never go to a messy seat. A mess only appears on the seat
        // of whoever just ate there, so in normal play this can't happen to
        // someone already heading to a seat; it's a safety net (e.g. for dev
        // commands or future features). If it does: back to the FRONT of the
        // line, since they'd already been given a seat. Checked before
        // "arrived" so they never sit down at a mess.
        if (messySeats.has(pointKey(c.seat!.seat))) joinLine(c, 'front');
        else if (arrived) {
          c.phase = 'eating';
          c.timer = between(config.eatSecondsMin, config.eatSecondsMax, rng);
        }
        break;

      case 'eating':
        if (c.timer <= 0) {
          messySeats.add(pointKey(c.seat!.seat)); // a mess on their own side of the table
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
  while (line.length > 0 && claimSeat(byId(line[0]), customers, layout, messySeats)) {
    line.shift();
  }
  const lastSpot = layout.waitingLine.length - 1;
  line.forEach((id, i) => {
    const c = byId(id);
    // If more people are waiting than there are spots (possible when someone
    // is sent back from a messy seat), the extras crowd the last spot.
    const spot = layout.waitingLine[Math.min(i, lastSpot)];
    if (!samePoint(destination(c.walker), spot)) c.walker = walkTo(c.walker, layout, spot);
  });

  // 5. Out the door.
  return {
    customers: customers.filter((c) => !walkedOut.has(c.id)),
    messySeats: [...messySeats],
    waitingLine: line,
    spawnTimer,
    nextCustomerId,
  };
}

/**
 * Gives `c` the nearest free, clean seat and sends them to it.
 * Returns false (and changes nothing) if there's no such seat.
 */
function claimSeat(
  c: Customer,
  everyone: readonly Customer[],
  layout: Layout,
  messySeats: ReadonlySet<string>,
): boolean {
  const others = everyone.filter((o) => o.id !== c.id);
  const seat = findFreeSeat(layout, messySeats, others, routeStart(c.walker));
  if (!seat) return false;
  c.seat = seat;
  c.walker = redirect(c.walker, (from) => routeToSeat(layout, from, seat.seat));
  c.phase = 'toSeat';
  return true;
}

/**
 * A seat with no mess that nobody has claimed, closest to `from`. Null if
 * every clean seat is taken. Only the seat itself matters: a mess on the
 * other side of the same table doesn't block it.
 */
export function findFreeSeat(
  layout: Layout,
  messySeats: ReadonlySet<string>,
  others: readonly Customer[],
  from: Point,
): SeatRef | null {
  let best: SeatRef | null = null;
  let bestSteps = Infinity;
  for (const table of layout.tables) {
    for (const seat of table.seats) {
      if (messySeats.has(pointKey(seat))) continue;
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
  const route = findPathNextTo(layout, from, seat);
  return route && [...route, seat];
}

/** The seats at `table` that currently have a mess. */
export function messySeatsAt(state: FloorState, table: Table): Point[] {
  return table.seats.filter((s) => state.messySeats.includes(pointKey(s)));
}

/** The floor with the given seats' messes wiped. Returns a new state, like stepFloor. */
export function cleanSeats(state: FloorState, seats: readonly Point[]): FloorState {
  const wiped = new Set(seats.map(pointKey));
  return { ...state, messySeats: state.messySeats.filter((key) => !wiped.has(key)) };
}
