import { describe, expect, it } from 'vitest';
import { CAFE_LAYOUT } from '../data/cafeLayout';
import type { FloorConfig } from '../data/floorConfig';
import {
  cleanSeats,
  createFloorState,
  hasFreeSeat,
  messySeatsAt,
  queueCapacity,
  stepFloor,
  type Customer,
  type FloorState,
} from './floor';
import { parseLayout, pointKey, type Layout, type Point } from './layout';
import { seededRng } from './random';
import { destination, walkerPosition } from './walker';

// One table with seats at (2,3) and (4,3). Order spot O at (4,2); counter
// queue spots behind it: 1 at (5,2), 2 at (5,3). Door at the bottom.
const TINY = parseLayout([
  'WWWWWWW', //
  'WPCCC.W',
  'W...O1W',
  'W.STS2W',
  'W.....W',
  'WWWDWWW',
]);
const LEFT_SEAT = { x: 2, y: 3 };
const RIGHT_SEAT = { x: 4, y: 3 };
const LEFT = pointKey(LEFT_SEAT);
const RIGHT = pointKey(RIGHT_SEAT);
const [SPOT_1] = TINY.queueSpots;

// Fast and predictable: fixed timings, and only one arrival unless a test
// asks for more.
const CONFIG: FloorConfig = {
  playerSpeed: 6,
  customerSpeed: 10,
  firstCustomerDelay: 0.5,
  spawnIntervalMin: 1000,
  spawnIntervalMax: 1000,
  orderSeconds: 1,
  eatSecondsMin: 2,
  eatSecondsMax: 2,
  patienceSeconds: 10,
  cleanSeconds: 1,
};
/** Arrivals every second. */
const BUSY: FloorConfig = { ...CONFIG, spawnIntervalMin: 1, spawnIntervalMax: 1 };

interface RunOptions {
  layout?: Layout;
  config?: FloorConfig;
  check?: (s: FloorState) => void;
}

/** Runs the simulation in small frames, calling `check` after each one. */
function run(state: FloorState, seconds: number, opts: RunOptions = {}): FloorState {
  const { layout = TINY, config = CONFIG, check } = opts;
  const rng = seededRng(1);
  for (let t = 0; t < seconds; t += 0.05) {
    state = stepFloor(state, layout, 0.05, rng, config);
    check?.(state);
  }
  return state;
}

/**
 * Runs until `done` is true. Throws if it takes longer than `maxSeconds`.
 * Tests say "until the customer is eating" instead of guessing exact
 * timings, so tweaking speeds doesn't break them.
 */
function runUntil(
  state: FloorState,
  done: (s: FloorState) => boolean,
  opts: RunOptions & { maxSeconds?: number } = {},
): FloorState {
  const { layout = TINY, config = CONFIG, maxSeconds = 30 } = opts;
  const rng = seededRng(1);
  for (let t = 0; t < maxSeconds; t += 0.05) {
    state = stepFloor(state, layout, 0.05, rng, config);
    if (done(state)) return state;
  }
  throw new Error(`runUntil: condition not met within ${maxSeconds}s`);
}

const find = (s: FloorState, id: number): Customer | undefined => s.customers.find((c) => c.id === id);
const phaseOf = (id: number, phase: Customer['phase']) => (s: FloorState) => find(s, id)?.phase === phase;
const step = (s: FloorState) => stepFloor(s, TINY, 0.05, seededRng(1), CONFIG);

const start = (): FloorState => createFloorState(CONFIG);
/** Both seats messy, so nobody can order. */
const allMessy = (): FloorState => ({ ...start(), messySeats: [LEFT, RIGHT] });

/** A customer standing still on `tile`, for building scenarios by hand. */
const customer = (id: number, tile: Point, extra: Partial<Customer>): Customer => ({
  id,
  walker: { tile, path: [], progress: 0 },
  phase: 'queued',
  timer: 0,
  patience: 100,
  seat: null,
  upset: false,
  ...extra,
});
const eatingAt = (id: number, seat: Point, timer = 1000): Customer =>
  customer(id, seat, { phase: 'eating', timer, seat: { tableId: 'table-0', seat } });
/** Customer heading from the order spot to `seat` (already served). */
const headingTo = (id: number, seat: Point): Customer =>
  customer(id, TINY.orderSpot, {
    phase: 'toSeat',
    walker: { tile: TINY.orderSpot, path: [seat], progress: 0.3 },
    seat: { tableId: 'table-0', seat },
  });

/** A hand-built scene with no new arrivals. */
const scene = (customers: Customer[], queue: number[] = [], messySeats: string[] = []): FloorState => ({
  ...start(),
  customers,
  queue,
  messySeats,
  spawnTimer: 1000,
  nextCustomerId: 100,
});

describe('stepFloor: one customer visit', () => {
  it('nobody arrives before the first delay, then one customer joins the queue', () => {
    expect(run(start(), 0.4).customers).toHaveLength(0);
    const s = run(start(), 0.6);
    expect(s.queue).toEqual([1]);
    expect(find(s, 1)!.phase).toBe('queued');
  });

  it('walks to the order spot and orders, reserving a seat', () => {
    const s = runUntil(start(), phaseOf(1, 'ordered'));
    const c = find(s, 1)!;
    expect(c.walker.tile).toEqual(TINY.orderSpot);
    expect(TINY.tables[0].seats).toContainEqual(c.seat?.seat);
  });

  it('once served, leaves the queue, goes to the reserved seat and eats', () => {
    const ordered = runUntil(start(), phaseOf(1, 'ordered'));
    const reserved = find(ordered, 1)!.seat!.seat;
    const s = runUntil(ordered, phaseOf(1, 'eating'));
    expect(s.queue).toEqual([]);
    expect(find(s, 1)!.walker.tile).toEqual(reserved);
    expect(s.messySeats).toEqual([]); // no mess while they eat
  });

  it('after eating, leaves a mess on THEIR seat only, and walks out not upset', () => {
    const eating = runUntil(start(), phaseOf(1, 'eating'));
    const theirSeat = pointKey(find(eating, 1)!.seat!.seat);
    let s = runUntil(eating, phaseOf(1, 'leaving'));
    expect(s.messySeats).toEqual([theirSeat]);
    expect(find(s, 1)!.upset).toBe(false);
    s = runUntil(s, (st) => st.customers.length === 0);
    expect(s.messySeats).toEqual([theirSeat]); // the mess stays until cleaned
  });
});

describe('stepFloor: patience', () => {
  it('starts full and counts down at a fixed rate while queued', () => {
    const s = run(allMessy(), 3); // nobody can order, so they just wait
    const c = find(s, 1)!;
    // Arrived at ~0.5s, so about 2.5s of patience is gone.
    expect(c.patience).toBeGreaterThan(CONFIG.patienceSeconds - 3);
    expect(c.patience).toBeLessThan(CONFIG.patienceSeconds - 2);
  });

  it('keeps counting down after ordering, while the order is made', () => {
    const ordered = runUntil(start(), phaseOf(1, 'ordered'));
    const later = step(ordered);
    expect(find(later, 1)!.patience).toBeLessThan(find(ordered, 1)!.patience);
  });

  it('stops once served', () => {
    const served = runUntil(start(), phaseOf(1, 'toSeat'));
    const eating = runUntil(served, phaseOf(1, 'eating'));
    expect(find(eating, 1)!.patience).toBe(find(served, 1)!.patience);
  });

  it('at zero, a queued customer leaves upset and the queue moves up', () => {
    let s = runUntil(allMessy(), (st) => st.queue.length === 2, { config: BUSY });
    s = runUntil(s, phaseOf(1, 'leaving'), { config: BUSY });
    expect(find(s, 1)!.upset).toBe(true);
    expect(s.queue[0]).toBe(2);
    s = run(s, 0.1, { config: BUSY });
    expect(destination(find(s, 2)!.walker)).toEqual(TINY.orderSpot);
  });

  it('at zero after ordering, they leave upset and their reserved seat is freed', () => {
    const tooSlow: FloorConfig = { ...CONFIG, orderSeconds: 100 };
    const s = runUntil(start(), phaseOf(1, 'leaving'), { config: tooSlow });
    expect(find(s, 1)!.upset).toBe(true);
    expect(find(s, 1)!.seat).toBeNull();
    expect(hasFreeSeat(s, TINY)).toBe(true);
  });
});

describe('stepFloor: counter queue', () => {
  it('the next customer queues behind, on spot 1', () => {
    const s = runUntil(allMessy(), (st) => st.queue.length === 2, { config: BUSY });
    s.queue.forEach((id) => expect(find(s, id)!.phase).toBe('queued'));
    expect(destination(find(s, 2)!.walker)).toEqual(SPOT_1);
  });

  it('nobody new comes in while the queue is full', () => {
    const fast: FloorConfig = { ...BUSY, spawnIntervalMin: 0.1, spawnIntervalMax: 0.1, patienceSeconds: 100 };
    const s = run(allMessy(), 10, { config: fast });
    expect(s.queue).toHaveLength(queueCapacity(TINY));
    expect(s.customers).toHaveLength(queueCapacity(TINY));
  });

  it('no clean seat, no order: the front customer keeps waiting', () => {
    const s = run(allMessy(), 3);
    expect(find(s, 1)!.walker.tile).toEqual(TINY.orderSpot);
    expect(find(s, 1)!.phase).toBe('queued');
    expect(hasFreeSeat(s, TINY)).toBe(false);
  });

  it("a reserved seat isn't free: the next customer waits even before the first reaches it", () => {
    // Customer 1 has been served and is walking to the only clean seat.
    // Customer 2 is at the front of the queue.
    const s = step(
      scene([headingTo(1, RIGHT_SEAT), customer(2, TINY.orderSpot, {})], [2], [LEFT]),
    );
    expect(find(s, 2)!.phase).toBe('queued');
    expect(find(s, 2)!.seat).toBeNull();
  });

  it('the front customer orders as soon as a seat is cleaned', () => {
    let s = run(allMessy(), 2);
    s = cleanSeats(s, [LEFT_SEAT]);
    s = step(s);
    expect(find(s, 1)!.phase).toBe('ordered');
    expect(find(s, 1)!.seat?.seat).toEqual(LEFT_SEAT);
  });

  it('only the front customer can order', () => {
    // Customer 2 is behind, with a free seat available; customer 1 is still
    // walking to the order spot.
    const s = step(
      scene(
        [
          customer(1, { x: 4, y: 4 }, { walker: { tile: { x: 4, y: 4 }, path: [{ x: 5, y: 4 }], progress: 0 } }),
          customer(2, SPOT_1, {}),
        ],
        [1, 2],
      ),
    );
    expect(find(s, 2)!.phase).toBe('queued');
  });
});

describe('stepFloor: messes are per seat', () => {
  it('a mess on the other side does not stop someone heading to their seat', () => {
    // Customer 1 finishes eating on the left just as customer 2 heads right.
    let s = scene([eatingAt(1, LEFT_SEAT, 0.01), headingTo(2, RIGHT_SEAT)]);
    s = runUntil(s, phaseOf(2, 'eating'));
    expect(s.messySeats).toEqual([LEFT]);
    expect(find(s, 2)!.seat?.seat).toEqual(RIGHT_SEAT);
  });

  it('a new customer gets the clean side of a half-messy table', () => {
    const s = runUntil({ ...start(), messySeats: [LEFT] }, phaseOf(1, 'eating'));
    expect(find(s, 1)!.seat?.seat).toEqual(RIGHT_SEAT);
  });

  // Safety net: in normal play a seat only gets messy when its own customer
  // leaves, so nobody can be heading to it. But if it ever happens (dev
  // commands, future features), nobody sits at a mess.
  it('if their reserved seat is somehow messy, they switch to another free seat', () => {
    const s = step(scene([headingTo(2, RIGHT_SEAT)], [], [RIGHT]));
    expect(find(s, 2)!.phase).toBe('toSeat');
    expect(find(s, 2)!.seat?.seat).toEqual(LEFT_SEAT);
  });

  it('...or leave (not upset: they were served) if there is none', () => {
    const s = step(scene([headingTo(2, RIGHT_SEAT)], [], [LEFT, RIGHT]));
    expect(find(s, 2)!.phase).toBe('leaving');
    expect(find(s, 2)!.upset).toBe(false);
    // And they never step onto the messy seat on their way out.
    run(s, 2, {
      check: (st) => {
        const c = find(st, 2);
        if (c) expect(walkerPosition(c.walker)).not.toEqual(RIGHT_SEAT);
      },
    });
  });
});

describe('messySeatsAt / cleanSeats', () => {
  it('lists the messy seats at a table', () => {
    expect(messySeatsAt({ ...start(), messySeats: [RIGHT] }, TINY.tables[0])).toEqual([RIGHT_SEAT]);
    expect(messySeatsAt(start(), TINY.tables[0])).toEqual([]);
  });

  it('wipes only the given seats, without changing the state it was given', () => {
    const messy = allMessy();
    const cleaned = cleanSeats(messy, [LEFT_SEAT]);
    expect(cleaned.messySeats).toEqual([RIGHT]);
    expect(messy.messySeats).toEqual([LEFT, RIGHT]);
  });
});

describe('stepFloor: rules that must always hold', () => {
  const checkInvariants = (layout: Layout) => (s: FloorState) => {
    const seats = s.customers.filter((c) => c.seat).map((c) => pointKey(c.seat!.seat));
    expect(new Set(seats).size, 'two customers share a seat').toBe(seats.length);

    // The queue and the customers' phases must agree exactly.
    const waiting = s.customers.filter((c) => c.phase === 'queued' || c.phase === 'ordered');
    expect([...s.queue].sort(), 'queue out of sync').toEqual(waiting.map((c) => c.id).sort());
    expect(s.queue.length).toBeLessThanOrEqual(queueCapacity(layout));

    // Only the front of the queue can have ordered.
    for (const c of s.customers.filter((c) => c.phase === 'ordered')) {
      expect(s.queue[0], `customer ${c.id} ordered but isn't at the front`).toBe(c.id);
      expect(c.seat, `customer ${c.id} ordered without a seat`).not.toBeNull();
    }

    for (const c of s.customers.filter((c) => c.phase === 'toSeat')) {
      expect(s.messySeats.includes(pointKey(c.seat!.seat)), `customer ${c.id} heading to a mess`).toBe(false);
    }
  };

  // Customers arrive often and eat for a while, so seats fill and the queue backs up.
  const busy: FloorConfig = { ...BUSY, spawnIntervalMin: 0.5, spawnIntervalMax: 0.5, eatSecondsMin: 5, eatSecondsMax: 8 };

  it('holds in a busy tiny cafe', () => {
    run(start(), 30, { config: busy, check: checkInvariants(TINY) });
  });

  it('holds over a long, random run in the real cafe', () => {
    const cafe = parseLayout(CAFE_LAYOUT);
    run(createFloorState(busy), 120, { layout: cafe, config: busy, check: checkInvariants(cafe) });
  });

  it('does not change the state it was given', () => {
    const before = runUntil(start(), phaseOf(1, 'ordered'));
    const snapshot = structuredClone(before);
    stepFloor(before, TINY, 1, seededRng(2), CONFIG);
    expect(before).toEqual(snapshot);
  });
});
