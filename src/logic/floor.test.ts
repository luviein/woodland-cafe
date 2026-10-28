import { describe, expect, it } from 'vitest';
import { CAFE_LAYOUT } from '../data/cafeLayout';
import type { FloorConfig } from '../data/floorConfig';
import { cleanTable, createFloorState, stepFloor, type Customer, type FloorState } from './floor';
import { parseLayout, type Layout } from './layout';
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

const start = (): FloorState => createFloorState(TINY, CONFIG);
const allDirty = (): FloorState => ({ ...start(), dirtyTables: { 'table-0': true } });

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
    expect(s.dirtyTables['table-0']).toBe(false); // clean while they eat
  });

  it('after eating, leaves a mess and walks out the door, not upset', () => {
    let s = runUntil(start(), phaseOf(1, 'leaving'));
    expect(s.dirtyTables['table-0']).toBe(true);
    expect(find(s, 1)!.upset).toBe(false);
    s = runUntil(s, (st) => st.customers.length === 0);
    expect(s.dirtyTables['table-0']).toBe(true); // the mess stays until cleaned
  });
});

describe('stepFloor: waiting line', () => {
  it('with no clean seat, a customer joins the line at spot 1', () => {
    const s = runUntil(allDirty(), phaseOf(1, 'waitingForSeat'));
    expect(s.waitingLine).toEqual([1]);
    expect(destination(find(s, 1)!.walker)).toEqual(SPOT_1);
  });

  it('the next customer queues behind, at spot 2', () => {
    const config = { ...CONFIG, spawnIntervalMin: 1, spawnIntervalMax: 1 };
    const s = runUntil(allDirty(), (st) => st.waitingLine.length === 2, { config });
    expect(s.waitingLine).toEqual([1, 2]);
    expect(destination(find(s, 2)!.walker)).toEqual(SPOT_2);
  });

  it('nobody new comes in while the line is full', () => {
    const config = { ...CONFIG, spawnIntervalMin: 0.1, spawnIntervalMax: 0.1, seatWaitSeconds: 100 };
    const s = run(allDirty(), 10, { config });
    expect(s.waitingLine).toHaveLength(TINY.waitingLine.length);
    expect(s.customers).toHaveLength(TINY.waitingLine.length);
  });

  it('runs out of patience and leaves upset; the line moves up', () => {
    const config = { ...CONFIG, spawnIntervalMin: 1, spawnIntervalMax: 1 };
    let s = runUntil(allDirty(), (st) => st.waitingLine.length === 2, { config });
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

describe('stepFloor: never walks to a dirty table', () => {
  // Customer 1 is about to finish eating at the left seat; customer 2 is
  // stepping toward the right seat of the same table.
  const setup = (line: Customer[] = []): FloorState =>
    scene(
      [
        eatingAt(1, LEFT_SEAT, 0.01),
        customer(2, TINY.orderSpot, {
          phase: 'toSeat',
          walker: { tile: TINY.orderSpot, path: [RIGHT_SEAT], progress: 0.3 },
          seat: { tableId: 'table-0', seat: RIGHT_SEAT },
        }),
        ...line,
      ],
      line.map((c) => c.id),
    );

  it('gives up the seat and goes to the FRONT of the line when the table gets messy', () => {
    const s = stepFloor(setup([waitingAt(9, SPOT_1)]), TINY, 0.05, seededRng(1), CONFIG);
    expect(s.dirtyTables['table-0']).toBe(true); // customer 1 left a mess
    const b = find(s, 2)!;
    expect(b.phase).toBe('waitingForSeat');
    expect(b.seat).toBeNull();
    expect(s.waitingLine).toEqual([2, 9]);
  });

  it('never steps onto the seat, and sits once the table is cleaned', () => {
    let s = stepFloor(setup(), TINY, 0.05, seededRng(1), CONFIG);
    s = run(s, 2, {
      check: (st) => {
        // Check where customer 2 actually IS on screen; after turning around,
        // the walker's `tile` field names the seat as the tile it came "from".
        const b = find(st, 2)!;
        expect(walkerPosition(b.walker)).not.toEqual(RIGHT_SEAT);
      },
    });
    s = { ...s, dirtyTables: { 'table-0': false } }; // cleaning comes in step 4
    runUntil(s, phaseOf(2, 'eating'));
  });
});

describe('cleanTable', () => {
  it('makes one table clean without changing the state it was given', () => {
    const dirty = allDirty();
    const cleaned = cleanTable(dirty, 'table-0');
    expect(cleaned.dirtyTables['table-0']).toBe(false);
    expect(dirty.dirtyTables['table-0']).toBe(true);
  });

  it('lets the front of the line sit down', () => {
    let s = runUntil(allDirty(), phaseOf(1, 'waitingForSeat'));
    s = cleanTable(s, 'table-0');
    runUntil(s, phaseOf(1, 'eating'));
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
        expect(s.dirtyTables[c.seat!.tableId], `customer ${c.id} heading to a dirty table`).toBe(false);
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
    run(createFloorState(cafe, config), 120, { layout: cafe, config, check: checkInvariants });
  });

  it('does not change the state it was given', () => {
    const before = runUntil(start(), phaseOf(1, 'ordering'));
    const snapshot = structuredClone(before);
    stepFloor(before, TINY, 1, seededRng(2), CONFIG);
    expect(before).toEqual(snapshot);
  });
});
