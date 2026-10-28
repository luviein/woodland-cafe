import { describe, expect, it } from 'vitest';
import { CAFE_LAYOUT } from '../data/cafeLayout';
import type { FloorConfig } from '../data/floorConfig';
import { createFloorState, stepFloor, type FloorState } from './floor';
import { parseLayout, type Layout } from './layout';
import { seededRng } from './random';

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
    const atCounter = s.customers.filter((c) => ['toCounter', 'ordering', 'waitingForSeat'].includes(c.phase));
    expect(atCounter.length, 'more than one customer at the counter').toBeLessThanOrEqual(1);
  };

  it('never puts two customers in one seat, or two at the counter', () => {
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
