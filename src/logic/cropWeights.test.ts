import { expect, it, vi } from 'vitest';
import { CROP_IDS, type CropVariant } from '../data/crops';
import { addCropWeights, cropRecord, randomCropWeight, weightBatches, validCropWeights } from './cropWeights';
import { createNewGame } from './gameState';
import { gardenCheckpoint, tendCrop } from './garden';
import { sellChristmasCrop, christmasSaleValue } from './cropExchange';
import { recordSpecialCrops } from './cropCollection';
import { useIngredients } from './stock';
import { loadGame, saveGame, SAVE_VERSION } from './save';

it('assigns an independent weight to every harvested unit, once, including doubled and ordinary crops', () => {
  for (const variant of ['ordinary', 'golden', 'christmas'] as CropVariant[]) {
    const state = createNewGame();
    state.garden.plots = [{ crop: 'mushroom', variant, wateredAt: 0 }, null, null, null, null, null];
    const draw = vi.fn().mockReturnValueOnce(0).mockReturnValueOnce(0.99).mockReturnValue(0.5);
    expect(tendCrop(state, 0, 1, 0, draw)).toBe(state);
    expect(draw).not.toHaveBeenCalled();
    const after = tendCrop(state, 0, 300000, 0, draw);
    expect(draw).toHaveBeenCalledTimes(8);
    expect(after.cropCollection).toEqual(variant === 'ordinary' ? [] : [`${variant}.mushroom`]);
    if (variant !== 'ordinary') expect(after.cropRecords[`${variant}.mushroom`]).toBe(4400);
    const key = `${variant}.mushroom` as const;
    const count = variant === 'ordinary' ? after.stock.mushroom : after.garden.harvests[variant].mushroom;
    expect(weightBatches(after.cropWeights, key, count)).toContainEqual({ grams: 4400, count: 1 });
    expect(tendCrop(after, 0, 300000, 0, draw)).toBe(after);
    expect(draw).toHaveBeenCalledTimes(8);
    expect(state.cropWeights).toEqual({});
  }
  expect([0, 0.949, 0.95, 0.99999].map(randomCropWeight)).toEqual([500, 2000, 2000, 5000]);
});

it('sells lightest first and sums individually rounded payouts, preserving heavy specimens for records', () => {
  const state = createNewGame();
  state.garden.harvests.christmas.tomato = 4;
  state.cropWeights = addCropWeights({}, 'tomato', 'christmas', [{ grams: 500, count: 1 }, { grams: 3240, count: 2 }]);
  expect(christmasSaleValue(state, 'tomato', 1)).toBe(1);
  expect(christmasSaleValue(state, 'tomato', 'all')).toBe(17);
  const one = sellChristmasCrop(state, 'tomato', 1);
  expect(one.christmasTickets).toBe(1);
  expect(weightBatches(one.cropWeights, 'christmas.tomato', 3)).toEqual([{ grams: 1000, count: 1 }, { grams: 3240, count: 2 }]);
  const all = sellChristmasCrop(one, 'tomato', 'all');
  expect(all.christmasTickets).toBe(17);
  expect(all.cropWeights).toEqual({});
  const full = { ...state, christmasTickets: Number.MAX_SAFE_INTEGER };
  expect(sellChristmasCrop(full, 'tomato', 1)).toBe(full);
});

it('upgrades a permanent record automatically with heavier specimens without spending crops', () => {
  const state = createNewGame();
  state.garden.harvests.golden.mushroom = 3;
  state.cropWeights = addCropWeights({}, 'mushroom', 'golden', [{ grams: 3240, count: 2 }]);
  const recorded = recordSpecialCrops(state);
  expect(cropRecord(recorded, 'golden.mushroom')).toBe(3240);
  expect(recorded.garden.harvests.golden.mushroom).toBe(3);
  expect(recordSpecialCrops(recorded)).toBe(recorded);
  const heavier = { ...recorded, cropWeights: addCropWeights(recorded.cropWeights, 'mushroom', 'golden', [{ grams: 4500, count: 1 }]),
    garden: { ...recorded.garden, harvests: { ...recorded.garden.harvests, golden: { ...recorded.garden.harvests.golden, mushroom: 4 } } } };
  const live = useIngredients(heavier, ['mushroom']).state;
  const upgraded = recordSpecialCrops(live);
  const saved = gardenCheckpoint(heavier, live, upgraded);
  expect(saved.stock).toEqual(heavier.stock);
  expect(saved.cropRecords).toEqual(upgraded.cropRecords);
  expect(cropRecord(upgraded, 'golden.mushroom')).toBe(4500);
  expect(upgraded.cropCollection).toEqual(['golden.mushroom']);
  expect(upgraded.garden.harvests.golden.mushroom).toBe(4);
  expect(upgraded.christmasTickets).toBe(0);
  expect(loadGame(saveGame(upgraded))).toEqual({ ok: true, state: upgraded });
});

it('keeps normal weights consistent when cooking, while garden checkpoints roll back cafe consumption', () => {
  const checkpoint = createNewGame();
  checkpoint.stock.mushroom = 3;
  checkpoint.cropWeights = addCropWeights({}, 'mushroom', 'ordinary', [{ grams: 500, count: 1 }, { grams: 3000, count: 1 }]);
  const live = useIngredients(checkpoint, ['mushroom', 'mushroom']).state;
  expect(weightBatches(live.cropWeights, 'ordinary.mushroom', 1)).toEqual([{ grams: 3000, count: 1 }]);
  live.garden.plots = [{ crop: 'mushroom', variant: 'ordinary', wateredAt: 0 }, null, null, null, null, null];
  const harvested = tendCrop(live, 0, 300000, 1, () => 0);
  const saved = gardenCheckpoint(checkpoint, live, harvested);
  expect(saved.stock.mushroom).toBe(7);
  expect(weightBatches(saved.cropWeights, 'ordinary.mushroom', 7)).toEqual([{ grams: 500, count: 5 }, { grams: 1000, count: 1 }, { grams: 3000, count: 1 }]);
  expect(validCropWeights(saved.cropWeights, saved)).toBe(true);
});

it('migrates legacy counts and donations at standard weight without allocating one object per crop', () => {
  const state = createNewGame();
  state.cropCollection = ['christmas.chilli'];
  state.garden.harvests.christmas.chilli = Number.MAX_SAFE_INTEGER;
  const { cropWeights: _weights, cropRecords: _records, ...old } = state;
  const loaded = loadGame(JSON.stringify({ version: 17, state: old }));
  expect(loaded).toEqual({ ok: true, state });
  expect(cropRecord(state, 'christmas.chilli')).toBe(1000);
  expect(weightBatches(state.cropWeights, 'christmas.chilli', Number.MAX_SAFE_INTEGER)).toHaveLength(1);
});

it('rejects damaged weight batches and invalid collection records rather than changing saved quantities', () => {
  const state = createNewGame();
  const badBatches = [null, [{ grams: -1, count: 1 }], [{ grams: 6000, count: 1 }], [{ grams: 500, count: 31 }], [{ grams: 500, count: 0 }], [{ grams: 500, count: 0.5 }], [{ grams: 500, count: 1 }, { grams: 500, count: 1 }]];
  for (const batches of badBatches) expect(loadGame(JSON.stringify({ version: SAVE_VERSION, state: { ...state, cropWeights: { 'ordinary.mushroom': batches } } })).ok).toBe(false);
  for (const records of [null, { 'golden.mushroom': 3000 }, { 'removed.crop': 1000 }]) expect(loadGame(JSON.stringify({ version: SAVE_VERSION, state: { ...state, cropRecords: records } })).ok).toBe(false);
  for (const crop of CROP_IDS) expect(validCropWeights({ [`ordinary.${crop}`]: [{ grams: 1000, count: 1 }] }, state)).toBe(false);
});
