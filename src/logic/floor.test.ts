import { describe, expect, it } from 'vitest';
import { CAFE_LAYOUT } from '../data/cafeLayout';
import type { FloorConfig } from '../data/floorConfig';
import {
  cleanSeats,
  createFloorState,
  messySeatsAt,
  stepFloor,
  type Customer,
  type FloorState,
} from './floor';
import { parseLayout, pointKey, type Layout } from './layout';
import { seededRng } from './random';
import { destination, walkerPosition } from './walker';

// One table with seats at (2,3) and (4,3). Order spot (4,2). Waiting line:
// spot 1 at (5,2), spot 2 at (5,3). Door at the bottom.
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
const [SPOT_1, SPOT_2] = TINY.waitingLine;

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
  seatWaitSeconds: 5,
  cleanSeconds: 1,
};

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

const start = (): FloorState => createFloorState(CONFIG);
const LEFT = pointKey(LEFT_SEAT);
const RIGHT = pointKey(RIGHT_SEAT);
/** Both seats messy, so nobody can sit. */
const allMessy = (): FloorState => ({ ...start(), messySeats: [LEFT, RIGHT] });

/** A customer standing still on `tile`, for building scenarios by hand. */
const customer = (id: number, tile: { x: number; y: number }, extra: Partial<Customer>): Customer => ({
  id,
  walker: { tile, path: [], progress: 0 },
  phase: 'eating',
  timer: 1000,
  seat: null,
  upset: false,
  ...extra,
});
const eatingAt = (id: number, seat: { x: number; y: number }, timer = 1000): Customer =>
  customer(id, seat, { phase: 'eating', timer, seat: { tableId: 'table-0', seat } });
const waitingAt = (id: number, spot: { x: number; y: number }): Customer =>
  customer(id, spot, { phase: 'waitingForSeat', timer: 1000 });

/** A hand-built scene with no new arrivals. */
const scene = (customers: Customer[], waitingLine: number[] = []): FloorState => ({
  ...start(),
  customers,
  waitingLine,
  spawnTimer: 1000,
  nextCustomerId: 100,
});

describe('stepFloor: one customer visit', () => {
  it('nobody arrives before the first delay, then one customer at the door', () => {
    expect(run(start(), 0.4).customers).toHaveLength(0);
    const s = run(start(), 0.6);
    expect(s.customers).toHaveLength(1);
    expect(s.customers[0].phase).toBe('toCounter');
  });

  it('walks to the order spot and orders', () => {
    const s = runUntil(start(), phaseOf(1, 'ordering'));
    expect(find(s, 1)!.walker.tile).toEqual(TINY.orderSpot);
  });

  it('after ordering, sits at a seat and eats', () => {
    const s = runUntil(start(), phaseOf(1, 'eating'));
    const c = find(s, 1)!;
    expect(c.seat?.tableId).toBe('table-0');
    expect(TINY.tables[0].seats).toContainEqual(c.walker.tile);
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

describe('stepFloor: waiting line', () => {
  it('with no clean seat, a customer joins the line at spot 1', () => {
    const s = runUntil(allMessy(), phaseOf(1, 'waitingForSeat'));
    expect(s.waitingLine).toEqual([1]);
    expect(destination(find(s, 1)!.walker)).toEqual(SPOT_1);
  });

  it('the next customer queues behind, at spot 2', () => {
    const config = { ...CONFIG, spawnIntervalMin: 1, spawnIntervalMax: 1 };
    const s = runUntil(allMessy(), (st) => st.waitingLine.length === 2, { config });
    expect(s.waitingLine).toEqual([1, 2]);
    expect(destination(find(s, 2)!.walker)).toEqual(SPOT_2);
  });

  it('nobody new comes in while the line is full', () => {
    const config = { ...CONFIG, spawnIntervalMin: 0.1, spawnIntervalMax: 0.1, seatWaitSeconds: 100 };
    const s = run(allMessy(), 10, { config });
    expect(s.waitingLine).toHaveLength(TINY.waitingLine.length);
    expect(s.customers).toHaveLength(TINY.waitingLine.length);
  });

  it('runs out of patience and leaves upset; the line moves up', () => {
    const config = { ...CONFIG, spawnIntervalMin: 1, spawnIntervalMax: 1 };
    let s = runUntil(allMessy(), (st) => st.waitingLine.length === 2, { config });
    s = runUntil(s, phaseOf(1, 'leaving'), { config });
    expect(find(s, 1)!.upset).toBe(true);
    expect(s.waitingLine[0]).toBe(2);
    s = run(s, 0.1, { config });
    expect(destination(find(s, 2)!.walker)).toEqual(SPOT_1);
  });

  it('first come, first served: the front of the line gets the free seat', () => {
    // One seat free (the left one is taken); customers 1 and 2 are waiting.
    const s = stepFloor(
      scene([eatingAt(3, LEFT_SEAT), waitingAt(1, SPOT_1), waitingAt(2, SPOT_2)], [1, 2]),
      TINY,
      0.05,
      seededRng(1),
      CONFIG,
    );
    expect(find(s, 1)!.phase).toBe('toSeat');
    expect(find(s, 1)!.seat?.seat).toEqual(RIGHT_SEAT);
    expect(find(s, 2)!.phase).toBe('waitingForSeat');
    expect(s.waitingLine).toEqual([2]);
  });

  it('a customer who just ordered cannot skip the line', () => {
    // Customer 1 is waiting; customer 5 finishes ordering as the seat frees.
    const s = stepFloor(
      scene(
        [
          eatingAt(3, LEFT_SEAT),
          waitingAt(1, SPOT_1),
          customer(5, TINY.orderSpot, { phase: 'ordering', timer: 0.01 }),
        ],
        [1],
      ),
      TINY,
      0.05,
      seededRng(1),
      CONFIG,
    );
    expect(find(s, 1)!.phase).toBe('toSeat');
    expect(find(s, 5)!.phase).toBe('waitingForSeat');
    expect(s.waitingLine).toEqual([5]);
  });
});

describe('stepFloor: messes are per seat', () => {
  /** Customer 2 stepping from the order spot toward the right seat. */
  const headingRight = (): Customer =>
    customer(2, TINY.orderSpot, {
      phase: 'toSeat',
      walker: { tile: TINY.orderSpot, path: [RIGHT_SEAT], progress: 0.3 },
      seat: { tableId: 'table-0', seat: RIGHT_SEAT },
    });

  it('a mess on the other side does not stop someone heading to their seat', () => {
    // Customer 1 finishes eating on the left just as customer 2 heads right.
    let s = scene([eatingAt(1, LEFT_SEAT, 0.01), headingRight()]);
    s = runUntil(s, phaseOf(2, 'eating'));
    expect(s.messySeats).toEqual([LEFT]);
    expect(find(s, 2)!.seat?.seat).toEqual(RIGHT_SEAT);
  });

  it('a new customer sits on the clean side of a half-messy table', () => {
    const s = runUntil({ ...start(), messySeats: [LEFT] }, phaseOf(1, 'eating'));
    expect(find(s, 1)!.seat?.seat).toEqual(RIGHT_SEAT);
  });

  // Safety net: in normal play a seat only gets messy when its own customer
  // leaves, so nobody can be heading to it. But if it ever happens (dev
  // commands, future features), the rule still holds.
  it('if their own seat is somehow messy, they go to the FRONT of the line', () => {
    const s = stepFloor(
      { ...scene([headingRight(), waitingAt(9, SPOT_1)], [9]), messySeats: [LEFT, RIGHT] },
      TINY,
      0.05,
      seededRng(1),
      CONFIG,
    );
    expect(find(s, 2)!.phase).toBe('waitingForSeat');
    expect(find(s, 2)!.seat).toBeNull();
    expect(s.waitingLine).toEqual([2, 9]);
  });

  it('...and never steps onto that seat, sitting once it is cleaned', () => {
    let s: FloorState = { ...scene([headingRight()]), messySeats: [LEFT, RIGHT] };
    s = run(s, 2, {
      check: (st) => {
        // Check where customer 2 actually IS on screen; after turning around,
        // the walker's `tile` field names the seat as the tile it came "from".
        expect(walkerPosition(find(st, 2)!.walker)).not.toEqual(RIGHT_SEAT);
      },
    });
    s = cleanSeats(s, [RIGHT_SEAT]);
    runUntil(s, phaseOf(2, 'eating'));
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

  it('cleaning lets the front of the line sit down', () => {
    let s = runUntil(allMessy(), phaseOf(1, 'waitingForSeat'));
    s = cleanSeats(s, [LEFT_SEAT]);
    s = runUntil(s, phaseOf(1, 'eating'));
    expect(find(s, 1)!.seat?.seat).toEqual(LEFT_SEAT);
  });
});

describe('stepFloor: rules that must always hold', () => {
  // Customers arrive every half second and eat for ages, so seats fill up and
  // the line gets used.
  const busy: FloorConfig = {
    ...CONFIG,
    spawnIntervalMin: 0.5,
    spawnIntervalMax: 0.5,
    eatSecondsMin: 20,
    eatSecondsMax: 20,
  };

  const checkInvariants = (s: FloorState) => {
    const seats = s.customers.filter((c) => c.seat).map((c) => `${c.seat!.seat.x},${c.seat!.seat.y}`);
    expect(new Set(seats).size, 'two customers share a seat').toBe(seats.length);

    const ordering = s.customers.filter((c) => c.phase === 'toCounter' || c.phase === 'ordering');
    expect(ordering.length, 'more than one customer ordering').toBeLessThanOrEqual(1);

    for (const c of s.customers) {
      if (c.phase === 'toSeat') {
        const messy = s.messySeats.includes(pointKey(c.seat!.seat));
        expect(messy, `customer ${c.id} heading to a messy seat`).toBe(false);
      }
    }

    // The line and the customers' phases must agree exactly.
    const waiting = s.customers.filter((c) => c.phase === 'waitingForSeat').map((c) => c.id);
    expect([...s.waitingLine].sort(), 'line out of sync with waiting customers').toEqual(waiting.sort());
  };

  it('holds in a busy tiny cafe', () => {
    const s = run(start(), 20, { config: busy, check: checkInvariants });
    expect(s.customers.filter((c) => c.phase === 'eating')).toHaveLength(2);
  });

  it('holds over a long, random run in the real cafe', () => {
    const cafe = parseLayout(CAFE_LAYOUT);
    const config: FloorConfig = { ...busy, eatSecondsMin: 3, eatSecondsMax: 8 };
    run(createFloorState(config), 120, { layout: cafe, config, check: checkInvariants });
  });

  it('does not change the state it was given', () => {
    const before = runUntil(start(), phaseOf(1, 'ordering'));
    const snapshot = structuredClone(before);
    stepFloor(before, TINY, 1, seededRng(2), CONFIG);
    expect(before).toEqual(snapshot);
  });
});
