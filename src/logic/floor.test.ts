import { describe, expect, it } from 'vitest';
import { CAFE_LAYOUT } from '../data/cafeLayout';
import type { FloorConfig } from '../data/floorConfig';
import { createFloorState, stepFloor, type FloorState } from './floor';
import { parseLayout, type Layout } from './layout';
import { seededRng } from './random';
import { walkerPosition } from './walker';

// One table, two seats, door at the bottom.
const TINY = parseLayout([
  'WWWWWWW', //
  'WPCCC.W',
  'W...O.W',
  'W.STS.W',
  'W.....W',
  'WWWDWWW',
]);

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
};

/** Runs the simulation in small frames, calling `check` after each one. */
function run(
  state: FloorState,
  seconds: number,
  { layout = TINY, config = CONFIG, check = (_s: FloorState) => {} } = {},
): FloorState {
  const rng = seededRng(1);
  const dt = 0.05;
  for (let t = 0; t < seconds; t += dt) {
    state = stepFloor(state, layout, dt, rng, config);
    check(state);
  }
  return state;
}

/**
 * Runs until `done` is true. Throws if it takes longer than `maxSeconds`.
 * Tests say "until the customer is eating" instead of guessing exact
 * timings, so tweaking speeds doesn't break them.
 */
function runUntil(state: FloorState, done: (s: FloorState) => boolean, maxSeconds = 30): FloorState {
  const rng = seededRng(1);
  for (let t = 0; t < maxSeconds; t += 0.05) {
    state = stepFloor(state, TINY, 0.05, rng, CONFIG);
    if (done(state)) return state;
  }
  throw new Error(`runUntil: condition not met within ${maxSeconds}s`);
}

const phaseOfFirst = (phase: string) => (s: FloorState) => s.customers[0]?.phase === phase;

const start = (layout: Layout = TINY) => createFloorState(layout, CONFIG);

describe('stepFloor: one customer visit', () => {
  it('nobody arrives before the first delay, then one customer at the door', () => {
    expect(run(start(), 0.4).customers).toHaveLength(0);
    const s = run(start(), 0.6);
    expect(s.customers).toHaveLength(1);
    expect(s.customers[0].phase).toBe('toCounter');
  });

  it('walks to the order spot and orders', () => {
    const s = runUntil(start(), phaseOfFirst('ordering'));
    expect(s.customers[0].walker.tile).toEqual(TINY.orderSpot);
  });

  it('after ordering, sits at a seat and eats', () => {
    const s = runUntil(start(), phaseOfFirst('eating'));
    const c = s.customers[0];
    expect(c.seat?.tableId).toBe('table-0');
    expect(TINY.tables[0].seats).toContainEqual(c.walker.tile);
    expect(s.dirtyTables['table-0']).toBe(false); // clean while they eat
  });

  it('after eating, leaves a mess and walks out the door', () => {
    let s = runUntil(start(), phaseOfFirst('leaving'));
    expect(s.dirtyTables['table-0']).toBe(true);
    expect(s.customers[0].seat).toBeNull();
    s = runUntil(s, (st) => st.customers.length === 0);
    expect(s.dirtyTables['table-0']).toBe(true); // the mess stays until cleaned
  });
});

describe('stepFloor: dirty tables', () => {
  it('a customer waits at the counter while every table is dirty', () => {
    const dirty = { ...start(), dirtyTables: { 'table-0': true } };
    let s = runUntil(dirty, phaseOfFirst('waitingForSeat'));
    s = run(s, 5); // and keeps waiting
    expect(s.customers[0].phase).toBe('waitingForSeat');
    expect(s.customers[0].seat).toBeNull();
  });

  it('the waiting customer sits down once the table is clean', () => {
    let s = runUntil({ ...start(), dirtyTables: { 'table-0': true } }, phaseOfFirst('waitingForSeat'));
    s = { ...s, dirtyTables: { 'table-0': false } }; // cleaning comes in step 4
    s = runUntil(s, phaseOfFirst('eating'));
    expect(s.customers[0].seat?.tableId).toBe('table-0');
  });
});

describe('stepFloor: never walks to a dirty table', () => {
  // A is about to finish eating at the left seat; B is stepping toward the
  // right seat of the same table.
  const setup = (): FloorState => ({
    ...start(),
    spawnTimer: 1000,
    nextCustomerId: 3,
    customers: [
      {
        id: 1,
        walker: { tile: { x: 2, y: 3 }, path: [], progress: 0 },
        phase: 'eating',
        timer: 0.01,
        seat: { tableId: 'table-0', seat: { x: 2, y: 3 } },
      },
      {
        id: 2,
        walker: { tile: { x: 4, y: 2 }, path: [{ x: 4, y: 3 }], progress: 0.3 },
        phase: 'toSeat',
        timer: 0,
        seat: { tableId: 'table-0', seat: { x: 4, y: 3 } },
      },
    ],
  });

  it('gives up the seat and goes back to wait when the table gets messy on the way', () => {
    const s = stepFloor(setup(), TINY, 0.05, seededRng(1), CONFIG);
    expect(s.dirtyTables['table-0']).toBe(true); // A left a mess
    const b = s.customers.find((c) => c.id === 2)!;
    expect(b.phase).toBe('waitingForSeat');
    expect(b.seat).toBeNull();
  });

  it('never steps onto the seat, and sits once the table is cleaned', () => {
    let s = stepFloor(setup(), TINY, 0.05, seededRng(1), CONFIG);
    s = run(s, 3, {
      check: (st) => {
        // Check where B actually IS on screen; after turning around, the
        // walker's `tile` field names the seat as the tile it came "from".
        const b = st.customers.find((c) => c.id === 2)!;
        expect(walkerPosition(b.walker)).not.toEqual({ x: 4, y: 3 });
      },
    });
    s = { ...s, dirtyTables: { 'table-0': false } };
    s = runUntil(s, (st) => st.customers.find((c) => c.id === 2)?.phase === 'eating');
  });
});

describe('stepFloor: rules that must always hold', () => {
  // Customers arrive every half second and eat for ages, so seats fill up.
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
    // Several customers can be waiting for a seat (someone sent back from a
    // table that got messy joins the one at the counter), but only one is
    // ever coming in to order.
    const ordering = s.customers.filter((c) => c.phase === 'toCounter' || c.phase === 'ordering');
    expect(ordering.length, 'more than one customer ordering').toBeLessThanOrEqual(1);
    for (const c of s.customers) {
      if (c.phase === 'toSeat') {
        expect(s.dirtyTables[c.seat!.tableId], `customer ${c.id} heading to a dirty table`).toBe(false);
      }
    }
  };

  it('never shares a seat, never heads to a dirty table, one customer ordering at a time', () => {
    const s = run(start(), 15, { config: busy, check: checkInvariants });
    // Both seats taken, the third customer waits.
    expect(s.customers.filter((c) => c.phase === 'eating')).toHaveLength(2);
    expect(s.customers.filter((c) => c.phase === 'waitingForSeat')).toHaveLength(1);
  });

  it('holds over a long, random run in the real cafe', () => {
    const cafe = parseLayout(CAFE_LAYOUT);
    const config: FloorConfig = { ...busy, eatSecondsMin: 3, eatSecondsMax: 8 };
    run(createFloorState(cafe, config), 120, { layout: cafe, config, check: checkInvariants });
  });

  it('does not change the state it was given', () => {
    const before = runUntil(start(), phaseOfFirst('ordering'));
    const snapshot = structuredClone(before);
    stepFloor(before, TINY, 1, seededRng(2), CONFIG);
    expect(before).toEqual(snapshot);
  });
});
