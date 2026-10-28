import { describe, expect, it } from 'vitest';
import type { FloorConfig } from '../data/floorConfig';
import { FLOOR_CONFIG } from '../data/floorConfig';
import { neighbours, parseLayout, samePoint, type Point } from './layout';
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
const SEAT = { x: 3, y: 3 };
const CONFIG: FloorConfig = { ...FLOOR_CONFIG, playerSpeed: 10, cleanSeconds: 1 };
const DIRTY = { 'table-0': true };
const CLEAN = { 'table-0': false };

const isNextTo = (p: Point, target: Point) => neighbours(target).some((n) => samePoint(n, p));

/** Steps the player in small frames; returns the final player and every cleaned table id. */
function run(player: PlayerState, seconds: number, dirty = DIRTY) {
  const cleaned: string[] = [];
  for (let t = 0; t < seconds; t += 0.05) {
    const result = stepPlayer(player, dirty, 0.05, CONFIG);
    player = result.player;
    if (result.cleanedTableId) cleaned.push(result.cleanedTableId);
  }
  return { player, cleaned };
}

describe('tableAt', () => {
  it('finds a table by its own tile or any of its seats', () => {
    expect(tableAt(ROOM, TABLE)?.id).toBe('table-0');
    expect(tableAt(ROOM, SEAT)?.id).toBe('table-0');
    expect(tableAt(ROOM, { x: 4, y: 4 })).toBeNull();
  });
});

describe('tapTile', () => {
  it('tapping a dirty table walks next to it and starts a cleaning job', () => {
    const p = tapTile(createPlayer(ROOM), ROOM, DIRTY, TABLE, CONFIG);
    expect(isNextTo(destination(p.walker), TABLE)).toBe(true);
    expect(p.cleaning).toEqual({ tableId: 'table-0', secondsLeft: 1 });
  });

  it('tapping a seat of a dirty table does the same (bigger tap target)', () => {
    const p = tapTile(createPlayer(ROOM), ROOM, DIRTY, SEAT, CONFIG);
    expect(p.cleaning?.tableId).toBe('table-0');
  });

  it('tapping a clean table does nothing', () => {
    const player = createPlayer(ROOM);
    expect(tapTile(player, ROOM, CLEAN, TABLE, CONFIG)).toBe(player);
  });

  it('tapping the floor walks there and cancels cleaning', () => {
    const cleaning = tapTile(createPlayer(ROOM), ROOM, DIRTY, TABLE, CONFIG);
    const p = tapTile(cleaning, ROOM, DIRTY, { x: 5, y: 4 }, CONFIG);
    expect(p.cleaning).toBeNull();
    expect(destination(p.walker)).toEqual({ x: 5, y: 4 });
  });

  it('tapping a wall changes nothing, not even an ongoing cleaning job', () => {
    const cleaning = tapTile(createPlayer(ROOM), ROOM, DIRTY, TABLE, CONFIG);
    expect(tapTile(cleaning, ROOM, DIRTY, { x: 0, y: 0 }, CONFIG)).toBe(cleaning);
  });
});

describe('stepPlayer: cleaning', () => {
  it('walks over, wipes for cleanSeconds, then reports the table clean', () => {
    const p = tapTile(createPlayer(ROOM), ROOM, DIRTY, TABLE, CONFIG);
    const { player, cleaned } = run(p, 3);
    expect(cleaned).toEqual(['table-0']);
    expect(player.cleaning).toBeNull();
  });

  it('does not count wiping time while still walking', () => {
    let p = tapTile(createPlayer(ROOM), ROOM, DIRTY, TABLE, CONFIG);
    p = stepPlayer(p, DIRTY, 0.05, CONFIG).player; // first step of the walk
    expect(p.cleaning?.secondsLeft).toBe(1);
    expect(cleaningProgress(p, CONFIG)).toBeNull();
  });

  it('shows progress while wiping', () => {
    let p = tapTile(createPlayer(ROOM), ROOM, DIRTY, TABLE, CONFIG);
    p = run(p, 0.5).player; // arrived (fast walker) and wiping
    const progress = cleaningProgress(p, CONFIG)!;
    expect(progress).toBeGreaterThan(0);
    expect(progress).toBeLessThan(1);
  });

  it('starts wiping right away when already next to the table', () => {
    const nextTo: PlayerState = { walker: { tile: { x: 2, y: 2 }, path: [], progress: 0 }, cleaning: null };
    const p = tapTile(nextTo, ROOM, DIRTY, TABLE, CONFIG);
    expect(p.walker.path).toEqual([]);
    expect(run(p, 1.1).cleaned).toEqual(['table-0']);
  });

  it('drops the job if the table is already clean', () => {
    const p = tapTile(createPlayer(ROOM), ROOM, DIRTY, TABLE, CONFIG);
    const { player, cleaned } = run(p, 3, CLEAN);
    expect(cleaned).toEqual([]);
    expect(player.cleaning).toBeNull();
  });

  it('reports each table only once', () => {
    const p = tapTile(createPlayer(ROOM), ROOM, DIRTY, TABLE, CONFIG);
    expect(run(p, 10).cleaned).toEqual(['table-0']);
  });
});
