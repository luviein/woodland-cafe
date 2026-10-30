import { describe, expect, it } from 'vitest';
import type { LeafConfig } from '../data/leafConfig';
import { collectLeaves, createLeafField, stepLeafField, type LeafField, type LeafGround } from './leafPickups';
import { seededRng } from './random';

const CONFIG: LeafConfig = {
  leafSpawnSecondsMin: 2,
  leafSpawnSecondsMax: 2, // fixed, so timings are easy to follow
  maxLeavesOnGround: 3,
  leavesOnArrival: 2,
  leafPickupRadius: 10,
  leavesPerDay: 15,
};
const GROUND: LeafGround = { area: { x: 0, y: 0, width: 100, height: 100 }, keepClear: [], clearance: 0 };
const field = (positions: [number, number][], spawnTimer = 2): LeafField => ({
  leaves: positions.map(([x, y], i) => ({ id: i + 1, position: { x, y } })),
  spawnTimer,
  nextId: positions.length + 1,
});

describe('createLeafField', () => {
  it('starts with a few leaves inside the area, each with its own id', () => {
    const f = createLeafField(GROUND, seededRng(1), CONFIG);
    expect(f.leaves.map((l) => l.id)).toEqual([1, 2]);
    for (const { position } of f.leaves) {
      expect(position.x >= 0 && position.x <= 100 && position.y >= 0 && position.y <= 100).toBe(true);
    }
    expect(f.spawnTimer).toBe(2);
  });

  it('keeps leaves away from spots that must stay clear', () => {
    const ground: LeafGround = { ...GROUND, keepClear: [{ x: 50, y: 50 }], clearance: 40 };
    const f = createLeafField(ground, seededRng(7), { ...CONFIG, leavesOnArrival: 3 });
    for (const { position } of f.leaves) {
      expect(Math.hypot(position.x - 50, position.y - 50)).toBeGreaterThanOrEqual(40);
    }
  });
});

describe('stepLeafField', () => {
  it('a new leaf appears when the timer runs out, and the timer restarts', () => {
    const rng = seededRng(2);
    const once = stepLeafField(field([]), 1.5, GROUND, rng, CONFIG);
    expect(once.leaves).toEqual([]);
    const twice = stepLeafField(once, 0.5, GROUND, rng, CONFIG);
    expect(twice.leaves.map((l) => l.id)).toEqual([1]);
    expect(twice.spawnTimer).toBe(2);
  });

  it('no new leaves while the ground is full; one comes as soon as there is room', () => {
    const rng = seededRng(3);
    const full = stepLeafField(field([[1, 1], [2, 2], [3, 3]]), 5, GROUND, rng, CONFIG);
    expect(full.leaves).toHaveLength(3);
    expect(full.spawnTimer).toBe(0);
    const picked = { ...full, leaves: full.leaves.slice(1) };
    expect(stepLeafField(picked, 0.01, GROUND, rng, CONFIG).leaves).toHaveLength(3);
  });
});

describe('the daily cap', () => {
  it('no more leaves on arrival than are left today', () => {
    expect(createLeafField(GROUND, seededRng(1), CONFIG, 1).leaves).toHaveLength(1);
    expect(createLeafField(GROUND, seededRng(1), CONFIG, 0).leaves).toEqual([]);
  });

  it('leaves on the ground count against it: no new ones once they would go over', () => {
    const rng = seededRng(4);
    const oneDown = field([[1, 1]], 0);
    expect(stepLeafField(oneDown, 1, GROUND, rng, CONFIG, 1).leaves).toHaveLength(1);
    expect(stepLeafField(oneDown, 1, GROUND, rng, CONFIG, 2).leaves).toHaveLength(2);
  });
});

describe('collectLeaves', () => {
  it('picks up leaves within reach (the edge counts) and leaves the rest', () => {
    const f = field([[10, 10], [20, 10], [50, 50]]);
    const { field: after, collected } = collectLeaves(f, { x: 10, y: 10 }, CONFIG);
    expect(collected.map((l) => l.id)).toEqual([1, 2]);
    expect(after.leaves.map((l) => l.id)).toEqual([3]);
  });

  it('nothing in reach: the same field comes back', () => {
    const f = field([[50, 50]]);
    expect(collectLeaves(f, { x: 0, y: 0 }, CONFIG).field).toBe(f);
  });
});
