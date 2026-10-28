import { describe, expect, it } from 'vitest';
import { CAFE_LAYOUT } from '../data/cafeLayout';
import { isWalkable, neighbours, parseLayout } from './layout';
import { findPath } from './pathfinding';

// A wall down the middle with a gap at the bottom, so paths must go around.
const ROOM = parseLayout([
  'WWWWWWW', //
  'WP.W.OW',
  'W..W..W',
  'W.....W',
  'WWDWWSW',
  'WWWWWTW',
]);

describe('findPath', () => {
  it('returns [] when already at the goal', () => {
    expect(findPath(ROOM, { x: 1, y: 1 }, { x: 1, y: 1 })).toEqual([]);
  });

  it('walks a straight line, excluding the start and including the goal', () => {
    expect(findPath(ROOM, { x: 1, y: 1 }, { x: 1, y: 3 })).toEqual([
      { x: 1, y: 2 },
      { x: 1, y: 3 },
    ]);
  });

  it('goes around walls', () => {
    const path = findPath(ROOM, { x: 1, y: 1 }, { x: 4, y: 1 })!;
    // Down to row 3, across under the wall, back up: 2 + 3 + 2 = 7 steps.
    expect(path).toHaveLength(7);
    expect(path.at(-1)).toEqual({ x: 4, y: 1 });
    for (const p of path) expect(isWalkable(ROOM, p)).toBe(true);
  });

  it('every step moves exactly one tile up, down, left or right', () => {
    const path = findPath(ROOM, { x: 1, y: 1 }, { x: 5, y: 1 })!;
    let prev = { x: 1, y: 1 };
    for (const p of path) {
      expect(Math.abs(p.x - prev.x) + Math.abs(p.y - prev.y)).toBe(1);
      prev = p;
    }
  });

  it('returns null for a blocked goal (wall or furniture)', () => {
    expect(findPath(ROOM, { x: 1, y: 1 }, { x: 3, y: 1 })).toBeNull(); // wall
    expect(findPath(ROOM, { x: 1, y: 1 }, { x: 5, y: 4 })).toBeNull(); // seat
  });

  it('returns null when the goal is walkable but sealed off', () => {
    const sealed = parseLayout([
      'WWWWWW', //
      'WP.W.W',
      'WSTW.W',
      'WODWWW',
    ]);
    expect(findPath(sealed, { x: 1, y: 1 }, { x: 4, y: 1 })).toBeNull();
  });
});

describe('the real cafe layout is fully reachable', () => {
  const cafe = parseLayout(CAFE_LAYOUT);

  it('the player can reach the door and the order spot', () => {
    expect(findPath(cafe, cafe.playerStart, cafe.door)).not.toBeNull();
    expect(findPath(cafe, cafe.playerStart, cafe.orderSpot)).not.toBeNull();
  });

  it('every seat and table has a walkable tile next to it that the door can reach', () => {
    // Customers must reach seats, and the player must reach tables to clean.
    for (const table of cafe.tables) {
      for (const spot of [table.position, ...table.seats]) {
        const reachable = neighbours(spot).some(
          (n) => isWalkable(cafe, n) && findPath(cafe, cafe.door, n) !== null,
        );
        expect(reachable, `(${spot.x}, ${spot.y}) in ${table.id}`).toBe(true);
      }
    }
  });
});
