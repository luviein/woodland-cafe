import { describe, expect, it } from 'vitest';
import { FLOOR_CONFIG, type FloorConfig } from '../data/floorConfig';
import { cleanerHome, createCleaner, stepCleaner, type CleanerState } from './cleaner';
import { cleanSeats, createFloorState, type FloorState } from './floor';
import { neighbours, parseLayout, pointKey, samePoint, type Point } from './layout';
import { isMoving } from './walker';

// Two tables: A at (2,2) near the top, B at (2,5) near the door (3,7).
const ROOM = parseLayout([
  'WWWWWWW', //
  'WP...1W',
  'WSTS.OW',
  'W.....W',
  'W.....W',
  'WSTS..W',
  'W.....W',
  'WWWDWWW',
]);
const [TABLE_A, TABLE_B] = ROOM.tables;
const CONFIG: FloorConfig = { ...FLOOR_CONFIG, cleanerSpeed: 10, cleanSeconds: 1 };

const floorWith = (...messy: Point[]): FloorState => ({
  ...createFloorState(CONFIG),
  messySeats: messy.map(pointKey),
});
const isNextTo = (p: Point, target: Point) => neighbours(target).some((n) => samePoint(n, p));

/** Steps the Cleaner in small frames, applying wipes like the scene does. */
function run(cleaner: CleanerState, floor: FloorState, seconds: number, playerTableId: string | null = null) {
  for (let t = 0; t < seconds; t += 0.05) {
    const result = stepCleaner(cleaner, floor, ROOM, playerTableId, 0.05, CONFIG);
    cleaner = result.cleaner;
    floor = cleanSeats(floor, result.cleanedSeats);
  }
  return { cleaner, floor };
}

describe('the Cleaner', () => {
  it('waits just inside the door', () => {
    expect(cleanerHome(ROOM)).toEqual({ x: 3, y: 6 });
    expect(createCleaner(ROOM).walker.tile).toEqual({ x: 3, y: 6 });
  });

  it('goes to the nearest messy table and wipes every mess on it', () => {
    const floor = floorWith(TABLE_A.seats[0], TABLE_B.seats[0], TABLE_B.seats[1]);
    const first = stepCleaner(createCleaner(ROOM), floor, ROOM, null, 0.01, CONFIG).cleaner;
    expect(first.cleaning?.tableId).toBe(TABLE_B.id); // B is nearer the door
    expect(first.cleaning?.totalSeconds).toBe(2); // two messes

    const after = run(createCleaner(ROOM), floor, 2.5);
    expect(after.floor.messySeats).toEqual([pointKey(TABLE_A.seats[0])]);
    // ...then moves on to the next one.
    expect(after.cleaner.cleaning?.tableId).toBe(TABLE_A.id);
    expect(run(after.cleaner, after.floor, 3).floor.messySeats).toEqual([]);
  });

  it("leaves the player's table to the player", () => {
    const floor = floorWith(TABLE_A.seats[0], TABLE_B.seats[0]);
    const first = stepCleaner(createCleaner(ROOM), floor, ROOM, TABLE_B.id, 0.01, CONFIG).cleaner;
    expect(first.cleaning?.tableId).toBe(TABLE_A.id);

    // Already heading to B when the player taps it: switches to A.
    const headingToB = stepCleaner(createCleaner(ROOM), floor, ROOM, null, 0.01, CONFIG).cleaner;
    const switched = stepCleaner(headingToB, floor, ROOM, TABLE_B.id, 0.01, CONFIG).cleaner;
    expect(switched.cleaning?.tableId).toBe(TABLE_A.id);
  });

  it('with nothing to wipe, walks back home and stays there', () => {
    const { cleaner } = run(createCleaner(ROOM), floorWith(TABLE_A.seats[0]), 4);
    expect(cleaner.cleaning).toBeNull();
    expect(isMoving(cleaner.walker)).toBe(false);
    expect(cleaner.walker.tile).toEqual(cleanerHome(ROOM));
  });

  it('drops a job someone else finished first', () => {
    const floor = floorWith(TABLE_B.seats[0]);
    const heading = stepCleaner(createCleaner(ROOM), floor, ROOM, null, 0.01, CONFIG).cleaner;
    const wiped = cleanSeats(floor, [TABLE_B.seats[0]]);
    expect(stepCleaner(heading, wiped, ROOM, null, 0.01, CONFIG).cleaner.cleaning).toBeNull();
  });

  it('wipes from next to the table, at the same speed as the player', () => {
    const floor = floorWith(TABLE_A.seats[1]);
    // Not done yet just after arriving...
    let cleaner = createCleaner(ROOM);
    let state = floor;
    while (!cleaner.cleaning || isMoving(cleaner.walker)) {
      const r = stepCleaner(cleaner, state, ROOM, null, 0.05, CONFIG);
      cleaner = r.cleaner;
      state = cleanSeats(state, r.cleanedSeats);
    }
    expect(isNextTo(cleaner.walker.tile, TABLE_A.position)).toBe(true);
    expect(run(cleaner, state, 0.8).floor.messySeats).toHaveLength(1);
    // ...and done after cleanSeconds (1s) of wiping.
    expect(run(cleaner, state, 1.1).floor.messySeats).toHaveLength(0);
  });
});
