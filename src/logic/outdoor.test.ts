import { describe, expect, it } from 'vitest';
import { clampToArea, createMover, stepMover, walkToward, type Rect } from './outdoor';

const AREA: Rect = { x: 10, y: 20, width: 100, height: 50 };

describe('clampToArea', () => {
  it('leaves points inside alone and pulls outside ones to the edge', () => {
    expect(clampToArea({ x: 50, y: 40 }, AREA)).toEqual({ x: 50, y: 40 });
    expect(clampToArea({ x: 0, y: 200 }, AREA)).toEqual({ x: 10, y: 70 });
  });
});

describe('walking', () => {
  it('walks toward the (clamped) target', () => {
    const m = walkToward(createMover({ x: 10, y: 20 }), { x: 500, y: 20 }, AREA);
    expect(m.target).toEqual({ x: 110, y: 20 });
    expect(stepMover(m, 30).position).toEqual({ x: 40, y: 20 });
  });

  it('moves the same distance on a diagonal', () => {
    const m = walkToward(createMover({ x: 10, y: 20 }), { x: 40, y: 60 }, AREA); // 50 away
    expect(stepMover(m, 25).position).toEqual({ x: 25, y: 40 });
  });

  it('stops exactly on the target instead of overshooting', () => {
    const m = walkToward(createMover({ x: 10, y: 20 }), { x: 15, y: 20 }, AREA);
    expect(stepMover(m, 30)).toEqual({ position: { x: 15, y: 20 }, target: null });
  });

  it('standing still: nothing changes', () => {
    const m = createMover({ x: 10, y: 20 });
    expect(stepMover(m, 30)).toBe(m);
  });

  it('a new tap replaces the old target', () => {
    const m = walkToward(walkToward(createMover({ x: 50, y: 40 }), { x: 100, y: 40 }, AREA), { x: 20, y: 40 }, AREA);
    expect(m.target).toEqual({ x: 20, y: 40 });
  });
});
