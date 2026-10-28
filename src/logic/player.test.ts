import { describe, expect, it } from 'vitest';
import type { FloorConfig } from '../data/floorConfig';
import { FLOOR_CONFIG } from '../data/floorConfig';
import { cleanSeats, createFloorState, type FloorState } from './floor';
import { neighbours, parseLayout, pointKey, samePoint, type Point } from './layout';
import { cleaningProgress, createPlayer, stepPlayer, tableAt, tapTile, type PlayerState } from './player';
import { destination } from './walker';

// One table at (2,3) with seats (1,3) and (3,3). Player starts at (1,1).
const ROOM = parseLayout([
  'WWWWWWW', //
  'WP...1W',
  'W...O.W',
  'WSTS..W',
  'W.....W',
  'WWWDWWW',
]);
const TABLE = { x: 2, y: 3 };
const LEFT_SEAT = { x: 1, y: 3 };
const RIGHT_SEAT = { x: 3, y: 3 };
// cleanSeconds 1 per mess; a fast walker so walking takes a fraction of a second.
const CONFIG: FloorConfig = { ...FLOOR_CONFIG, playerSpeed: 10, cleanSeconds: 1 };

const floorWith = (...messy: Point[]): FloorState => ({
  ...createFloorState(CONFIG),
  messySeats: messy.map(pointKey),
});
const ONE_MESS = floorWith(RIGHT_SEAT);
const TWO_MESSES = floorWith(LEFT_SEAT, RIGHT_SEAT);
const CLEAN = floorWith();

const isNextTo = (p: Point, target: Point) => neighbours(target).some((n) => samePoint(n, p));

/**
 * Steps the player in small frames, applying finished wipes to the floor
 * like the scene does. Returns the final player and floor, plus every batch
 * of seats cleaned.
 */
function run(player: PlayerState, floor: FloorState, seconds: number) {
  const cleaned: Point[][] = [];
  for (let t = 0; t < seconds; t += 0.05) {
    const result = stepPlayer(player, floor, 0.05, CONFIG);
    player = result.player;
    if (result.cleanedSeats.length > 0) {
      cleaned.push(result.cleanedSeats);
      floor = cleanSeats(floor, result.cleanedSeats);
    }
  }
  return { player, floor, cleaned };
}

describe('tableAt', () => {
  it('finds a table by its own tile or any of its seats', () => {
    expect(tableAt(ROOM, TABLE)?.id).toBe('table-0');
    expect(tableAt(ROOM, RIGHT_SEAT)?.id).toBe('table-0');
    expect(tableAt(ROOM, { x: 4, y: 4 })).toBeNull();
  });
});

describe('tapTile', () => {
  it('tapping a table with a mess walks next to it and starts a cleaning job', () => {
    const p = tapTile(createPlayer(ROOM), ROOM, ONE_MESS, TABLE, CONFIG);
    expect(isNextTo(destination(p.walker), TABLE)).toBe(true);
    expect(p.cleaning).toEqual({
      tableId: 'table-0',
      seats: [RIGHT_SEAT],
      secondsLeft: 1,
      totalSeconds: 1,
    });
  });

  it('wiping time is per mess: two messes take twice as long', () => {
    const p = tapTile(createPlayer(ROOM), ROOM, TWO_MESSES, TABLE, CONFIG);
    expect(p.cleaning?.seats).toEqual([LEFT_SEAT, RIGHT_SEAT]);
    expect(p.cleaning?.totalSeconds).toBe(2);
  });

  it('tapping a seat works too (bigger tap target), and cleans the whole table', () => {
    const p = tapTile(createPlayer(ROOM), ROOM, TWO_MESSES, LEFT_SEAT, CONFIG);
    expect(p.cleaning?.seats).toEqual([LEFT_SEAT, RIGHT_SEAT]);
  });

  it('tapping a clean table does nothing', () => {
    const player = createPlayer(ROOM);
    expect(tapTile(player, ROOM, CLEAN, TABLE, CONFIG)).toBe(player);
  });

  it('tapping the floor walks there and cancels cleaning', () => {
    const cleaning = tapTile(createPlayer(ROOM), ROOM, ONE_MESS, TABLE, CONFIG);
    const p = tapTile(cleaning, ROOM, ONE_MESS, { x: 5, y: 4 }, CONFIG);
    expect(p.cleaning).toBeNull();
    expect(destination(p.walker)).toEqual({ x: 5, y: 4 });
  });

  it('tapping a wall changes nothing, not even an ongoing cleaning job', () => {
    const cleaning = tapTile(createPlayer(ROOM), ROOM, ONE_MESS, TABLE, CONFIG);
    expect(tapTile(cleaning, ROOM, ONE_MESS, { x: 0, y: 0 }, CONFIG)).toBe(cleaning);
  });
});

describe('stepPlayer: cleaning', () => {
  it('walks over, wipes for cleanSeconds, then reports the messy seat cleaned', () => {
    const p = tapTile(createPlayer(ROOM), ROOM, ONE_MESS, TABLE, CONFIG);
    const { player, floor, cleaned } = run(p, ONE_MESS, 3);
    expect(cleaned).toEqual([[RIGHT_SEAT]]);
    expect(floor.messySeats).toEqual([]);
    expect(player.cleaning).toBeNull();
  });

  it('two messes are wiped together, and take longer', () => {
    const p = tapTile(createPlayer(ROOM), ROOM, TWO_MESSES, TABLE, CONFIG);
    // After 1.5s, one mess's worth of time has passed: not done yet.
    expect(run(p, TWO_MESSES, 1.5).cleaned).toEqual([]);
    expect(run(p, TWO_MESSES, 3).cleaned).toEqual([[LEFT_SEAT, RIGHT_SEAT]]);
  });

  it('a mess that appears mid-wipe is not part of the job', () => {
    let p = tapTile(createPlayer(ROOM), ROOM, ONE_MESS, TABLE, CONFIG);
    let floor = ONE_MESS;
    ({ player: p, floor } = run(p, floor, 0.5)); // wiping has started
    floor = floorWith(LEFT_SEAT, RIGHT_SEAT); // someone leaves a new mess
    const result = run(p, floor, 3);
    expect(result.cleaned).toEqual([[RIGHT_SEAT]]);
    expect(result.floor.messySeats).toEqual([pointKey(LEFT_SEAT)]); // needs another tap
  });

  it('does not count wiping time while still walking', () => {
    let p = tapTile(createPlayer(ROOM), ROOM, ONE_MESS, TABLE, CONFIG);
    p = stepPlayer(p, ONE_MESS, 0.05, CONFIG).player; // first step of the walk
    expect(p.cleaning?.secondsLeft).toBe(1);
    expect(cleaningProgress(p)).toBeNull();
  });

  it('shows progress while wiping', () => {
    const p = tapTile(createPlayer(ROOM), ROOM, TWO_MESSES, TABLE, CONFIG);
    const progress = cleaningProgress(run(p, TWO_MESSES, 1).player)!;
    expect(progress).toBeGreaterThan(0);
    expect(progress).toBeLessThan(1);
  });

  it('starts wiping right away when already next to the table', () => {
    const nextTo: PlayerState = { walker: { tile: { x: 2, y: 2 }, path: [], progress: 0 }, cleaning: null };
    const p = tapTile(nextTo, ROOM, ONE_MESS, TABLE, CONFIG);
    expect(p.walker.path).toEqual([]);
    expect(run(p, ONE_MESS, 1.1).cleaned).toEqual([[RIGHT_SEAT]]);
  });

  it('drops the job if the messes are already gone', () => {
    const p = tapTile(createPlayer(ROOM), ROOM, ONE_MESS, TABLE, CONFIG);
    const { player, cleaned } = run(p, CLEAN, 3);
    expect(cleaned).toEqual([]);
    expect(player.cleaning).toBeNull();
  });

  it('reports each job only once', () => {
    const p = tapTile(createPlayer(ROOM), ROOM, ONE_MESS, TABLE, CONFIG);
    expect(run(p, ONE_MESS, 10).cleaned).toHaveLength(1);
  });
});
