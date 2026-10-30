import { FLOOR_CONFIG, type FloorConfig } from '../data/floorConfig';
import { pointKey, samePoint, type Layout, type Point, type Table } from './layout';
import { generateOrder, type Owned } from './orders';
import { findPathNextTo } from './pathfinding';
import type { Rng } from './random';
import { canMakeOrder, type Pantry } from './stock';
import type { Order, Score } from './types';
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
 *   queued   -> the player takes their order (takeOrder: front of the
 *               queue, and a clean seat is free), or patience runs out
 *   ordered  -> served at the prep station (serveCustomer), or patience runs out
 *   served   -> released (releaseCustomer) once the prep screen closes: they
 *               stay at the counter while reacting, so they don't walk off
 *               while the player is still looking at the prep station
 *   toSeat   -> sat down
 *   eating   -> timer ran out; stands up and leaves a mess
 *   leaving  -> reached the door and is removed
 */
export type CustomerPhase = 'queued' | 'ordered' | 'served' | 'toSeat' | 'eating' | 'leaving';

export interface SeatRef {
  tableId: string;
  seat: Point;
}

export interface Customer {
  id: number;
  walker: Walker;
  phase: CustomerPhase;
  /** Seconds left in a timed phase (only eating, for now). */
  timer: number;
  /** What they asked for; set when the player takes their order. */
  order: Order | null;
  /** How their dish scored; set when served. Decides where they go on release. */
  score: Score | null;
  /**
   * Seconds of patience left. Counts down at a fixed rate while queued and
   * ordered (even while the order is being made); stops once served.
   */
  patience: number;
  /** The seat this customer has reserved, from ordering until leaving it. */
  seat: SeatRef | null;
  /** True if they're leaving unhappy: out of patience, a wrong dish, or their dish ran out. */
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
  /**
   * Customer ids in the counter queue, front first. queue[0] stands at the
   * order spot (and stays there until served); the rest stand on the queue
   * spots behind.
   */
  queue: number[];
  /** Seconds until the next customer arrives. */
  spawnTimer: number;
  /**
   * False after closing time: nobody new comes in, but whoever is inside
   * stays and can still be served. The day decides when (logic/day.ts).
   */
  doorsOpen: boolean;
  nextCustomerId: number;
}

export function createFloorState(config: FloorConfig = FLOOR_CONFIG): FloorState {
  return {
    customers: [],
    messySeats: [],
    queue: [],
    spawnTimer: config.firstCustomerDelay,
    doorsOpen: true,
    nextCustomerId: 1,
  };
}

/** How many customers the counter queue holds: the order spot plus the spots behind. */
export function queueCapacity(layout: Layout): number {
  return 1 + layout.queueSpots.length;
}

/** Where the customer at position `i` in the queue stands. */
function queuePosition(layout: Layout, i: number): Point {
  return i === 0 ? layout.orderSpot : layout.queueSpots[i - 1];
}

const between = (min: number, max: number, rng: Rng): number => min + rng() * (max - min);

/**
 * Advances the floor by `seconds`. Returns a NEW state; the old one is left
 * untouched (same reasons as stepWalker: easy to test, no shared-object bugs).
 *
 * Works in passes, because the queue needs to see everyone at once:
 *   1. move everyone and count down their timers and patience
 *   2. maybe let a new customer in (if the queue has room)
 *   3. each customer reacts to their own situation (patience out? served?)
 *   4. everyone still queued walks to their spot
 *   5. drop customers who walked out the door
 * Orders aren't taken here: that's the player's action, see takeOrder().
 */
export function stepFloor(
  state: FloorState,
  layout: Layout,
  seconds: number,
  rng: Rng = Math.random,
  config: FloorConfig = FLOOR_CONFIG,
): FloorState {
  const messySeats = new Set(state.messySeats);
  const queue = [...state.queue];
  let { spawnTimer, nextCustomerId } = state;

  // 1. Fresh copies we're free to change; the input state stays untouched.
  const customers: Customer[] = state.customers.map((c) => {
    const waiting = c.phase === 'queued' || c.phase === 'ordered';
    return {
      ...c,
      walker: stepWalker(c.walker, seconds, config.customerSpeed),
      timer: c.timer - seconds,
      // Fixed rate, whatever else is going on; only while waiting to be served.
      patience: waiting ? c.patience - seconds : c.patience,
    };
  });

  // 2. A new customer walks in if it's time, the doors are open and the
  // queue has room.
  spawnTimer -= seconds;
  if (state.doorsOpen && spawnTimer <= 0 && queue.length < queueCapacity(layout)) {
    const id = nextCustomerId++;
    customers.push({
      id,
      walker: createWalker(layout.door), // pass 5 sends them to their queue spot
      phase: 'queued',
      timer: 0,
      order: null,
      score: null,
      patience: config.patienceSeconds,
      seat: null,
      upset: false,
    });
    queue.push(id);
    spawnTimer = between(config.spawnIntervalMin, config.spawnIntervalMax, rng);
  }

  const leave = (c: Customer, upset: boolean): void => {
    c.phase = 'leaving';
    c.seat = null; // frees a reserved seat too
    c.upset = upset;
    c.walker = walkTo(c.walker, layout, layout.door);
    const inQueue = queue.indexOf(c.id);
    if (inQueue >= 0) queue.splice(inQueue, 1);
  };

  // 3. Each customer reacts to their own situation.
  const walkedOut = new Set<number>();
  for (const c of customers) {
    const arrived = !isMoving(c.walker);
    switch (c.phase) {
      case 'queued':
      case 'ordered':
        // Being served is the player's action (serveCustomer), not a timer.
        if (c.patience <= 0) leave(c, true); // waited too long: leaves unhappy, doesn't pay
        break;

      case 'served':
        break; // food in hand, patience stopped: waits at the counter until released

      case 'toSeat':
        // Safety net: a mess only appears on the seat of whoever just ate
        // there, so a reserved seat can't normally get messy. If it ever does
        // (dev commands, future features), move to another free seat, or
        // leave rather than sit at a mess.
        if (messySeats.has(pointKey(c.seat!.seat))) {
          if (!claimSeat(c, customers, layout, messySeats)) leave(c, false);
        } else if (arrived) {
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

  // 4. Everyone in the queue walks to their spot. When someone leaves or is
  // served, the people behind them move up.
  const byId = (id: number): Customer => customers.find((c) => c.id === id)!;
  queue.forEach((id, i) => {
    const c = byId(id);
    // More people than spots can't normally happen (arrivals stop when the
    // queue is full), but just in case, extras crowd the last spot.
    const spot = queuePosition(layout, Math.min(i, queueCapacity(layout) - 1));
    if (!samePoint(destination(c.walker), spot)) c.walker = walkTo(c.walker, layout, spot);
  });

  // 5. Out the door.
  return {
    customers: customers.filter((c) => !walkedOut.has(c.id)),
    messySeats: [...messySeats],
    queue,
    spawnTimer,
    doorsOpen: state.doorsOpen,
    nextCustomerId,
  };
}

/**
 * The front customer, if they're standing at the order spot ready to order.
 * Null while the queue is empty or the front is still walking up.
 */
export function customerAtCounter(state: FloorState, layout: Layout): Customer | null {
  const front = state.customers.find((c) => c.id === state.queue[0]);
  const ready =
    front?.phase === 'queued' && !isMoving(front.walker) && samePoint(front.walker.tile, layout.orderSpot);
  return ready ? front : null;
}

/**
 *   ordered  - the front customer ordered and reserved a seat
 *   noSeat   - they're ready, but every clean seat is taken: go clean a table
 *   notReady - nobody is standing at the order spot (yet)
 */
export type TakeOrderResult = 'ordered' | 'noSeat' | 'outOfStock' | 'notReady';

/**
 * The player takes the front customer's order: they pick a dish (from what
 * the player owns) and reserve the nearest free clean seat, so the next
 * customer can't take it. The floor module doesn't check where the PLAYER is:
 * that's player.ts's job, which keeps this rule usable by employees later too.
 *
 * If their dish can't be made (not enough stock, and not enough Leaves to
 * rush-buy the rest), they leave upset instead, unpaid (GAME_DESIGN.md §3.6).
 * The seat is checked first: with nowhere to sit, nobody orders at all.
 */
export function takeOrder(
  state: FloorState,
  layout: Layout,
  game: Owned & Pantry,
  rng: Rng = Math.random,
): { floor: FloorState; result: TakeOrderResult } {
  const front = customerAtCounter(state, layout);
  if (!front) return { floor: state, result: 'notReady' };
  const seat = findFreeSeat(layout, new Set(state.messySeats), state.customers, layout.orderSpot);
  if (!seat) return { floor: state, result: 'noSeat' };

  const order = generateOrder(game, rng);
  if (!canMakeOrder(game, order)) {
    // They keep the order, so the scene can say what ran out.
    const left: Customer = {
      ...front,
      order,
      phase: 'leaving',
      upset: true,
      walker: walkTo(front.walker, layout, layout.door),
    };
    return {
      floor: { ...replaceCustomer(state, left), queue: state.queue.filter((id) => id !== front.id) },
      result: 'outOfStock',
    };
  }
  const ordered: Customer = { ...front, seat, phase: 'ordered', order };
  return { floor: replaceCustomer(state, ordered), result: 'ordered' };
}

/**
 * The customer who ordered gets their dish, scored at the prep station.
 * Patience stops here, but they stay at the counter (still first in the
 * queue) until releaseCustomer(), so nobody walks off while the player is
 * still reading their reaction.
 * Does nothing if they're no longer waiting for food (e.g. gave up a moment
 * ago), so a late serve can't bring someone back.
 */
export function serveCustomer(state: FloorState, customerId: number, score: Score): FloorState {
  const c = state.customers.find((o) => o.id === customerId);
  if (c?.phase !== 'ordered') return state;
  return replaceCustomer(state, { ...c, phase: 'served', score });
}

/**
 * A served customer moves on, based on how their dish scored:
 *   perfect / close: they head to the seat reserved for them
 *   wrong:           they leave, angry (no pay, no eating), freeing their seat
 * Either way they leave the queue, and the next customer moves up.
 * Does nothing unless they're 'served'.
 */
export function releaseCustomer(state: FloorState, layout: Layout, customerId: number): FloorState {
  const c = state.customers.find((o) => o.id === customerId);
  if (c?.phase !== 'served') return state;

  const released: Customer =
    c.score === 'wrong'
      ? { ...c, phase: 'leaving', seat: null, upset: true, walker: walkTo(c.walker, layout, layout.door) }
      : { ...c, phase: 'toSeat', walker: redirect(c.walker, (from) => routeToSeat(layout, from, c.seat!.seat)) };
  // Out of the queue: the next customer moves up to the order spot on the next step.
  return { ...replaceCustomer(state, released), queue: state.queue.filter((id) => id !== customerId) };
}

/**
 * How many customers ran out of patience between two floor states (usually
 * one stepFloor apart): they were waiting in `before` and are leaving upset
 * in `after`. A wrong dish doesn't count: that customer was served.
 */
export function countGaveUp(before: FloorState, after: FloorState): number {
  const waiting = new Set(
    before.customers.filter((c) => c.phase === 'queued' || c.phase === 'ordered').map((c) => c.id),
  );
  return after.customers.filter((c) => waiting.has(c.id) && c.phase === 'leaving' && c.upset).length;
}

/** `state` with the customer of the same id swapped for `c`. */
function replaceCustomer(state: FloorState, c: Customer): FloorState {
  return { ...state, customers: state.customers.map((o) => (o.id === c.id ? c : o)) };
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
  return true;
}

/**
 * A seat with no mess that nobody has reserved, closest to `from`. Null if
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

/** True if at least one clean seat is free, i.e. the front customer could order. */
export function hasFreeSeat(state: FloorState, layout: Layout): boolean {
  return findFreeSeat(layout, new Set(state.messySeats), state.customers, layout.orderSpot) !== null;
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
