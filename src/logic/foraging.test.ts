import { describe, expect, it } from 'vitest';
import type { ForageSpotDef } from '../data/forageSpots';
import {
  forage,
  gatheredToday,
  gatheringProgress,
  spotsAt,
  standPoint,
  startGathering,
  stepGathering,
} from './foraging';
import { createNewGame, startNextDay } from './gameState';
import { createMover, walkToward } from './outdoor';

const SPOT: ForageSpotDef = {
  id: 'testMushrooms',
  location: 'forest',
  kind: 'mushroomPatch',
  position: { x: 100, y: 100 },
  ingredient: 'mushroom',
  amount: 2,
};
const CONFIG = { forageSeconds: 1 };
const standing = createMover({ x: 100, y: 112 });

describe('forage', () => {
  it('adds the ingredient to stock and marks the spot gathered', () => {
    const before = createNewGame();
    const after = forage(before, SPOT);
    expect(after.stock.mushroom).toBe(before.stock.mushroom + 2);
    expect(gatheredToday(after, SPOT)).toBe(true);
    expect(gatheredToday(before, SPOT)).toBe(false); // untouched
  });

  it('only once a day; it grows back the next day', () => {
    const once = forage(createNewGame(), SPOT);
    expect(forage(once, SPOT)).toBe(once);
    const tomorrow = startNextDay(once);
    expect(gatheredToday(tomorrow, SPOT)).toBe(false);
    expect(forage(tomorrow, SPOT).stock.mushroom).toBe(once.stock.mushroom + 2);
  });
});

describe('gathering', () => {
  it('stands just below the spot, in front of it', () => {
    expect(standPoint(SPOT)).toEqual({ x: 100, y: 112 });
  });

  it('no work while still walking there', () => {
    const walking = walkToward(standing, { x: 0, y: 0 }, { x: 0, y: 0, width: 200, height: 200 });
    const g = startGathering(SPOT, CONFIG);
    expect(stepGathering(g, walking, 5)).toEqual({ gathering: g, finished: false });
    expect(gatheringProgress(g, walking, CONFIG)).toBeNull();
  });

  it('works once there, and finishes after forageSeconds', () => {
    const half = stepGathering(startGathering(SPOT, CONFIG), standing, 0.5);
    expect(half.finished).toBe(false);
    expect(gatheringProgress(half.gathering!, standing, CONFIG)).toBe(0.5);
    expect(stepGathering(half.gathering!, standing, 0.5)).toEqual({ gathering: null, finished: true });
  });
});

describe('spotsAt', () => {
  it('lists only the spots in that place', () => {
    expect(spotsAt('forest', [SPOT]).map((s) => s.id)).toEqual(['testMushrooms']);
    expect(spotsAt('marketplace', [SPOT])).toEqual([]);
  });
});
