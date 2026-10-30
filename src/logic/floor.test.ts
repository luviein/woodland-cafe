import { describe, expect, it } from 'vitest';
import { CAFE_LAYOUT } from '../data/cafeLayout';
import type { FloorConfig } from '../data/floorConfig';
import {
  cleanSeats,
  createFloorState,
  customerAtCounter,
  hasFreeSeat,
  messySeatsAt,
  queueCapacity,
  releaseCustomer,
  serveCustomer,
  stepFloor,
  takeOrder,
  type Customer,
  type FloorState,
} from './floor';
import { parseLayout, pointKey, type Layout, type Point } from './layout';
import { createNewGame } from './gameState';
import { availableRecipes } from './orders';
import { seededRng } from './random';
import type { Score } from './types';
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
/** What the player owns: a brand-new game's starters. */
const OWNED = createNewGame();

// Fast and predictable: fixed timings, and only one arrival unless a test
// asks for more.
const CONFIG: FloorConfig = {
  playerSpeed: 6,
  customerSpeed: 10,
  firstCustomerDelay: 0.5,
  spawnIntervalMin: 1000,
  spawnIntervalMax: 1000,
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
  /**
   * Take the front customer's order the moment it's possible, like a player
   * who never looks away from the counter. On by default so the tests can
   * follow whole visits; switch off to test what customers do on their own.
   */
  autoOrder?: boolean;
  /**
   * Serve a perfect dish one frame after the order is taken, and release
   * the customer the frame after that (like the prep screen closing), so
   * tests can still see the 'ordered' and 'served' phases. On by default;
   * off = the cook never finishes.
   */
  autoServe?: boolean;
}

/** One simulation frame, plus the attentive "player" if autoOrder/autoServe are on. */
function frame(state: FloorState, rng: () => number, opts: RunOptions): FloorState {
  const { layout = TINY, config = CONFIG, autoOrder = true, autoServe = true } = opts;
  state = stepFloor(state, layout, 0.05, rng, config);
  if (autoServe) {
    for (const c of state.customers) {
      if (c.phase === 'served') state = releaseCustomer(state, layout, c.id);
      if (c.phase === 'ordered') state = serveCustomer(state, c.id, 'perfect');
    }
  }
  return autoOrder ? takeOrder(state, layout, OWNED, rng).floor : state;
}

/** Runs the simulation in small frames, calling `check` after each one. */
function run(state: FloorState, seconds: number, opts: RunOptions = {}): FloorState {
  const rng = seededRng(1);
  for (let t = 0; t < seconds; t += 0.05) {
    state = frame(state, rng, opts);
    opts.check?.(state);
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
  const { maxSeconds = 30 } = opts;
  const rng = seededRng(1);
  for (let t = 0; t < maxSeconds; t += 0.05) {
    state = frame(state, rng, opts);
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
  order: null,
  score: null,
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
    const s = runUntil(start(), phaseOf(1, 'leaving'), { autoServe: false });
    expect(find(s, 1)!.upset).toBe(true);
    expect(find(s, 1)!.seat).toBeNull();
    expect(hasFreeSeat(s, TINY)).toBe(true);
  });
});

describe('stepFloor: closing time', () => {
  it('nobody new comes in once the doors are closed', () => {
    const s = run({ ...start(), doorsOpen: false }, 10, { config: BUSY });
    expect(s.customers).toHaveLength(0);
  });

  it('whoever is already inside stays and can still be served', () => {
    const inside = runUntil(start(), (st) => st.queue.length === 1);
    const s = runUntil({ ...inside, doorsOpen: false }, phaseOf(1, 'eating'));
    expect(s.customers.map((c) => c.id)).toEqual([1]);
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

  it('nobody orders by themselves: the front customer waits at the counter for the player', () => {
    const s = run(start(), 3, { autoOrder: false });
    expect(find(s, 1)!.walker.tile).toEqual(TINY.orderSpot);
    expect(find(s, 1)!.phase).toBe('queued');
    expect(customerAtCounter(s, TINY)?.id).toBe(1);
  });
});

describe('takeOrder', () => {
  const atCounter = (): FloorState => scene([customer(1, TINY.orderSpot, {})], [1]);

  it('the front customer orders and reserves the nearest clean seat', () => {
    const { floor, result } = takeOrder(atCounter(), TINY, OWNED);
    expect(result).toBe('ordered');
    expect(find(floor, 1)!.phase).toBe('ordered');
    expect(availableRecipes(OWNED)).toContain(find(floor, 1)!.order?.recipeId);
    expect(TINY.tables[0].seats).toContainEqual(find(floor, 1)!.seat?.seat);
  });

  it('no clean seat: nothing changes, and says why', () => {
    const messy = { ...atCounter(), messySeats: [LEFT, RIGHT] };
    const { floor, result } = takeOrder(messy, TINY, OWNED);
    expect(result).toBe('noSeat');
    expect(floor).toBe(messy);
  });

  it('works as soon as a seat is cleaned', () => {
    const s = cleanSeats({ ...atCounter(), messySeats: [LEFT, RIGHT] }, [LEFT_SEAT]);
    expect(find(takeOrder(s, TINY, OWNED).floor, 1)!.seat?.seat).toEqual(LEFT_SEAT);
  });

  it("a reserved seat isn't free: the next customer can't order even before the first reaches it", () => {
    // Customer 1 has been served and is walking to the only clean seat.
    // Customer 2 is at the front of the queue.
    const s = scene([headingTo(1, RIGHT_SEAT), customer(2, TINY.orderSpot, {})], [2], [LEFT]);
    expect(takeOrder(s, TINY, OWNED).result).toBe('noSeat');
  });

  it('nobody at the order spot yet: notReady, even with someone further back', () => {
    // Customer 1 (the front) is still walking to the order spot; customer 2 waits behind.
    const walking = customer(1, { x: 4, y: 4 }, { walker: { tile: { x: 4, y: 4 }, path: [{ x: 5, y: 4 }], progress: 0 } });
    const s = scene([walking, customer(2, SPOT_1, {})], [1, 2]);
    expect(takeOrder(s, TINY, OWNED).result).toBe('notReady');
    expect(takeOrder(scene([]), TINY, OWNED).result).toBe('notReady');
  });

  it("can't order twice", () => {
    const once = takeOrder(atCounter(), TINY, OWNED).floor;
    expect(takeOrder(once, TINY, OWNED).result).toBe('notReady');
  });

  it('does not change the state it was given', () => {
    const before = atCounter();
    const snapshot = structuredClone(before);
    takeOrder(before, TINY, OWNED);
    expect(before).toEqual(snapshot);
  });
});

describe('serveCustomer / releaseCustomer', () => {
  /** Customer 1 has ordered (right seat reserved); customer 2 queues behind. */
  const ordered = (): FloorState =>
    scene(
      [
        customer(1, TINY.orderSpot, {
          phase: 'ordered',
          order: { recipeId: 'plainBread', modifiers: [], quantity: 1 },
          seat: { tableId: 'table-0', seat: RIGHT_SEAT },
        }),
        customer(2, SPOT_1, {}),
      ],
      [1, 2],
    );
  const servedAndReleased = (score: Score): FloorState =>
    releaseCustomer(serveCustomer(ordered(), 1, score), TINY, 1);

  it('served: stays at the counter, first in the queue, with the score noted', () => {
    const s = run(serveCustomer(ordered(), 1, 'perfect'), 2, { autoServe: false, autoOrder: false });
    const c = find(s, 1)!;
    expect(c.phase).toBe('served');
    expect(c.score).toBe('perfect');
    expect(c.walker.tile).toEqual(TINY.orderSpot);
    expect(s.queue).toEqual([1, 2]);
  });

  it('patience stops once served, even while they wait to be released', () => {
    const served = serveCustomer(ordered(), 1, 'perfect');
    const later = run(served, 2, { autoServe: false, autoOrder: false });
    expect(find(later, 1)!.patience).toBe(find(served, 1)!.patience);
  });

  it.each(['perfect', 'close'] as const)('%s, once released: heads to their reserved seat and leaves the queue', (score) => {
    const s = servedAndReleased(score);
    expect(find(s, 1)!.phase).toBe('toSeat');
    expect(destination(find(s, 1)!.walker)).toEqual(RIGHT_SEAT);
    expect(s.queue).toEqual([2]);
  });

  it('wrong, once released: leaves angry and frees the seat', () => {
    const s = servedAndReleased('wrong');
    const c = find(s, 1)!;
    expect(c.phase).toBe('leaving');
    expect(c.upset).toBe(true);
    expect(c.seat).toBeNull();
    expect(destination(c.walker)).toEqual(TINY.door);
    expect(s.queue).toEqual([2]);
    expect(hasFreeSeat(s, TINY)).toBe(true);
  });

  it('the next customer moves up to the order spot after the release', () => {
    const s = step(servedAndReleased('perfect'));
    expect(destination(find(s, 2)!.walker)).toEqual(TINY.orderSpot);
  });

  it('serve does nothing for someone who is not waiting for food', () => {
    const s = ordered();
    expect(serveCustomer(s, 2, 'perfect')).toBe(s); // hasn't ordered
    expect(serveCustomer(s, 99, 'perfect')).toBe(s); // already gone
  });

  it('release does nothing unless they were served (e.g. they gave up)', () => {
    const s = ordered();
    expect(releaseCustomer(s, TINY, 1)).toBe(s);
    expect(releaseCustomer(s, TINY, 99)).toBe(s);
  });

  it('neither changes the state it was given', () => {
    const before = ordered();
    const snapshot = structuredClone(before);
    const served = serveCustomer(before, 1, 'wrong');
    const servedSnapshot = structuredClone(served);
    releaseCustomer(served, TINY, 1);
    expect(before).toEqual(snapshot);
    expect(served).toEqual(servedSnapshot);
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
    const atCounter = ['queued', 'ordered', 'served'];
    const waiting = s.customers.filter((c) => atCounter.includes(c.phase));
    expect([...s.queue].sort(), 'queue out of sync').toEqual(waiting.map((c) => c.id).sort());
    expect(s.queue.length).toBeLessThanOrEqual(queueCapacity(layout));

    // Only the front of the queue can have ordered (or be served, waiting to go).
    for (const c of s.customers.filter((c) => c.phase === 'ordered' || c.phase === 'served')) {
      expect(s.queue[0], `customer ${c.id} ordered but isn't at the front`).toBe(c.id);
      expect(c.seat, `customer ${c.id} ordered without a seat`).not.toBeNull();
      expect(c.order, `customer ${c.id} ordered nothing`).not.toBeNull();
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
