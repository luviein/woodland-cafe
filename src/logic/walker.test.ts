import { describe, expect, it } from 'vitest';
import { parseLayout } from './layout';
import { createWalker, isMoving, stepWalker, walkerPosition, walkTo } from './walker';

const ROOM = parseLayout([
  'WWWWWW', //
  'WP...W',
  'WSTO.W',
  'W....W',
  'WWDWWW',
]);

describe('stepWalker', () => {
  const walker = { tile: { x: 1, y: 1 }, path: [{ x: 2, y: 1 }, { x: 3, y: 1 }], progress: 0 };

  it('moves part of a tile in a short frame', () => {
    const next = stepWalker(walker, 0.25, 2); // 0.5 tiles
    expect(next.tile).toEqual({ x: 1, y: 1 });
    expect(next.progress).toBeCloseTo(0.5);
    expect(walkerPosition(next)).toEqual({ x: 1.5, y: 1 });
  });

  it('can cross several tiles in one long frame', () => {
    const next = stepWalker(walker, 1, 1.5); // 1.5 tiles
    expect(next.tile).toEqual({ x: 2, y: 1 });
    expect(next.path).toEqual([{ x: 3, y: 1 }]);
    expect(next.progress).toBeCloseTo(0.5);
  });

  it('stops exactly at the end of the path', () => {
    const next = stepWalker(walker, 10, 5);
    expect(next).toEqual({ tile: { x: 3, y: 1 }, path: [], progress: 0 });
    expect(isMoving(next)).toBe(false);
  });

  it('does not change the walker it was given', () => {
    stepWalker(walker, 1, 1);
    expect(walker.tile).toEqual({ x: 1, y: 1 });
  });
});

describe('walkTo', () => {
  it('plans a route from a standing start', () => {
    const w = walkTo(createWalker({ x: 1, y: 1 }), ROOM, { x: 4, y: 1 });
    expect(w.path).toEqual([{ x: 2, y: 1 }, { x: 3, y: 1 }, { x: 4, y: 1 }]);
  });

  it('mid-step, turns around instead if the new goal is behind it', () => {
    let w = walkTo(createWalker({ x: 1, y: 1 }), ROOM, { x: 4, y: 1 });
    w = stepWalker(w, 0.25, 1); // a quarter of the way to (2, 1)
    const before = walkerPosition(w);
    w = walkTo(w, ROOM, { x: 1, y: 1 }); // changed my mind: go back
    expect(w.tile).toEqual({ x: 2, y: 1 });
    expect(w.path).toEqual([{ x: 1, y: 1 }]);
    expect(walkerPosition(w)).toEqual(before); // no jump on screen
    w = stepWalker(w, 10, 1);
    expect(w.tile).toEqual({ x: 1, y: 1 });
  });

  it('mid-step, finishes the current step when that is shorter', () => {
    let w = walkTo(createWalker({ x: 1, y: 1 }), ROOM, { x: 4, y: 1 });
    w = stepWalker(w, 0.5, 1); // halfway to (2, 1)
    w = walkTo(w, ROOM, { x: 2, y: 3 });
    expect(w.path[0]).toEqual({ x: 2, y: 1 }); // still heading to the tile it started toward
    expect(w.path.at(-1)).toEqual({ x: 2, y: 3 });
    expect(w.progress).toBeCloseTo(0.5);
  });

  it('ignores unreachable goals', () => {
    const w = createWalker({ x: 1, y: 1 });
    expect(walkTo(w, ROOM, { x: 2, y: 2 })).toBe(w); // table
  });
});
