import { expect, it } from 'vitest';
import { createNewGame } from './gameState';
import { buySeed, plantCrop, tendCrop } from './garden';
import { finishGardenWork, gardenStandPoint, gardenWorkProgress, startGardenWork, stepGardenWork, HARVEST_DISPLAY_SECONDS, stepHarvestDisplay } from './gardenWork';

const fresh = () => buySeed({ ...createNewGame(), leaves: 5 }, 'mushroom');

it('keeps the picked crop in the display for half a second, then puts it away', () => {
  const display = { crop: 'tomato' as const, secondsLeft: HARVEST_DISPLAY_SECONDS };
  const remaining = stepHarvestDisplay(display, 0.2)!;
  expect(remaining.crop).toBe('tomato');
  expect(remaining.secondsLeft).toBeCloseTo(0.3);
  expect(stepHarvestDisplay(remaining, 0.3)).toBeNull();
  expect(display.secondsLeft).toBe(0.5);
  expect(stepHarvestDisplay(display, -1)).toEqual(display);
});

it('walks before working and changes no stock until completion', () => {
  const state = fresh(), work = startGardenWork(state, 0, 'mushroom', 1000)!;
  const moving = { position: { x: 70, y: 180 }, target: gardenStandPoint({ x: 212, y: 138 }) };
  expect(stepGardenWork(work, moving, 5)).toEqual({ work, finished: false });
  const standing = { ...moving, position: moving.target, target: null };
  const halfway = stepGardenWork(work, standing, 0.3);
  expect(halfway.finished).toBe(false);
  expect(gardenWorkProgress(halfway.work!)).toBeGreaterThan(0);
  expect(state.garden.seeds.mushroom).toBe(1);
  expect(stepGardenWork(halfway.work!, standing, 0.4).finished).toBe(true);
  const planted = finishGardenWork(state, work, 1000);
  expect(planted.garden.seeds.mushroom).toBe(0);
  expect(finishGardenWork(planted, work, 1000)).toBe(planted);
});

it('chooses water and harvest from crop readiness and rejects growing or empty seed choices', () => {
  const planted = plantCrop(fresh(), 0, 'mushroom');
  expect(startGardenWork(planted, 0, 'tomato', 1000)?.action).toBe('water');
  const wet = tendCrop(planted, 0, 1000);
  expect(startGardenWork(wet, 0, 'mushroom', 300999)).toBeNull();
  expect(startGardenWork(wet, 0, 'mushroom', 301000)?.action).toBe('harvest');
  expect(startGardenWork(createNewGame(), 0, 'mushroom', 0)).toBeNull();
  expect(startGardenWork(fresh(), -1, 'mushroom', 0)).toBeNull();
});

it('revalidates completion and never waters twice or grants duplicate harvests', () => {
  const planted = plantCrop(fresh(), 0, 'mushroom');
  const water = startGardenWork(planted, 0, 'mushroom', 1000)!;
  const wet = finishGardenWork(planted, water, 2000);
  expect(wet.garden.plots[0]?.wateredAt).toBe(2000);
  expect(finishGardenWork(wet, water, 999999)).toBe(wet);
  const harvest = startGardenWork(wet, 0, 'mushroom', 302000)!;
  expect(finishGardenWork(wet, harvest, 301999)).toBe(wet);
  const done = finishGardenWork(wet, harvest, 302000);
  expect(done.stock.mushroom).toBe(wet.stock.mushroom + 4);
  expect(finishGardenWork(done, harvest, 302000)).toBe(done);
});

it('retains the chosen planting crop and follows arranged beds in either row', () => {
  const state = fresh(), work = startGardenWork(state, 0, 'mushroom', 0)!;
  expect(finishGardenWork(state, work, 0).garden.plots[0]?.crop).toBe('mushroom');
  expect(gardenStandPoint({ x: 212, y: 138 })).toEqual({ x: 200, y: 138 });
  expect(gardenStandPoint({ x: 500, y: 238 })).toEqual({ x: 488, y: 238 });
});
