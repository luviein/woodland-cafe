import { expect, it } from 'vitest';
import { emptyMuseum, type Museum } from './museum';
import { moveInMuseum, museumCanStand, museumLineClear, museumWalkingRoute, MUSEUM_WALK_SPEED } from './museumWalking';
import type { Point } from './layout';

it('walks to the exact point directly and replans from a fractional position without backtracking', () => {
  const museum = emptyMuseum(), target = { x: 8.6, y: 4.3 };
  expect(museumWalkingRoute(museum, { x: 6, y: 7 }, target)).toEqual([target]);
  const midway = { x: 6.4, y: 6.5 }, changed = { x: 3.4, y: 4.2 };
  expect(museumWalkingRoute(museum, midway, changed)).toEqual([changed]);
});

it('retains subpixel movement at high refresh rates instead of rounding away each step', () => {
  const museum = emptyMuseum();
  const simulate = (frames: number): Point => {
    let position = { x: 1, y: 3 };
    for (let i = 0; i < frames; i++) position = moveInMuseum(museum, position, { x: MUSEUM_WALK_SPEED / 24 / frames, y: 0 });
    return position;
  };
  expect(simulate(60).x).toBeCloseTo(1 + MUSEUM_WALK_SPEED / 24);
  expect(simulate(240).x).toBeCloseTo(simulate(60).x);
  expect(simulate(1000).x).toBeCloseTo(simulate(60).x);
});

it('slides around cases and respects walls without tunnelling on a large movement step', () => {
  const museum: Museum = { ...emptyMuseum(), nextCaseId: 2, cases: [{ id: 1, x: 3, y: 3, exhibit: null }] };
  const blocked = moveInMuseum(museum, { x: 1, y: 3 }, { x: 6, y: 0 });
  expect(blocked.x).toBeLessThan(3);
  expect(museumCanStand(museum, blocked)).toBe(true);
  const slid = moveInMuseum(museum, { x: 2.2, y: 3 }, { x: 0.4, y: 0.4 });
  expect(slid.x).toBeLessThan(2.3);
  expect(slid.y).toBeGreaterThan(3);
  expect(moveInMuseum(museum, { x: 0, y: 0 }, { x: -3, y: -3 })).toEqual({ x: 0, y: 0 });
});

it('smooths routes around occupied cases without cutting corners and approaches exhibits', () => {
  const museum: Museum = { ...emptyMuseum(), nextCaseId: 2, cases: [{ id: 1, x: 3, y: 3, exhibit: null }] };
  const start = { x: 1.4, y: 3.1 }, end = { x: 6.2, y: 3.1 };
  expect(museumLineClear(museum, start, end)).toBe(false);
  const route = museumWalkingRoute(museum, start, end)!;
  expect(route.at(-1)).toEqual(end);
  let previous = start;
  for (const point of route) { expect(museumLineClear(museum, previous, point)).toBe(true); previous = point; }
  const approach = museumWalkingRoute(museum, start, museum.cases[0], 1)!;
  const last = approach.at(-1)!;
  expect(Math.abs(last.x - 3) + Math.abs(last.y - 3)).toBe(1);
  expect(museumCanStand(museum, last)).toBe(true);
  expect(museumWalkingRoute(museum, start, end, 999)).toBeNull();
});
