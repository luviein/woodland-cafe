import { expect, it } from 'vitest';
import { COLLECTION_IDS, recordSpecialCrops } from './cropCollection';
import { createNewGame } from './gameState';
import { loadGame } from './save';

it('records special stock without spending it, retains records after sales and ignores ordinary stock', () => {
  const fresh = createNewGame();
  expect(recordSpecialCrops(fresh)).toBe(fresh);
  fresh.garden.harvests.golden.mushroom = 4;
  const recorded = recordSpecialCrops(fresh);
  expect(recorded.cropCollection).toEqual(['golden.mushroom']);
  expect(recorded.cropRecords).toEqual({ 'golden.mushroom': 1000 });
  expect(recorded.garden).toBe(fresh.garden);
  expect(recordSpecialCrops(recorded)).toBe(recorded);
  const sold = { ...recorded, garden: createNewGame().garden };
  expect(recordSpecialCrops(sold)).toBe(sold);
});

it('migrates older saves without losing crops or tickets and sanitises saved collection ids', () => {
  const state = { ...createNewGame(), christmasTickets: 22 };
  state.garden.harvests.christmas.tomato = 8;
  const { cropCollection: _collection, ...old } = state;
  expect(loadGame(JSON.stringify({ version: 15, state: old }))).toEqual({ ok: true, state: recordSpecialCrops(state) });
  expect(loadGame(JSON.stringify({ version: 16, state: { ...state,
    cropCollection: ['removed.crop', 'christmas.tomato', 'christmas.tomato', 'golden.mushroom'],
  } }))).toEqual({ ok: true, state: recordSpecialCrops({ ...state, cropCollection: COLLECTION_IDS.filter(id => ['golden.mushroom', 'christmas.tomato'].includes(id)) }) });
  const weighted = { ...state, cropCollection: ['christmas.tomato'] as const, cropRecords: { 'christmas.tomato': 3240 },
    cropWeights: { 'christmas.tomato': [{ grams: 4500, count: 1 }] } };
  expect(loadGame(JSON.stringify({ version: 18, state: weighted }))).toEqual({ ok: true, state: recordSpecialCrops(weighted) });
  const bestKept = { ...weighted, cropRecords: { 'christmas.tomato': 5000 } };
  expect(loadGame(JSON.stringify({ version: 18, state: bestKept }))).toEqual({ ok: true, state: bestKept });
  for (const invalid of [null, 1, 'golden.mushroom', {}]) {
    expect(loadGame(JSON.stringify({ version: 16, state: { ...state, cropCollection: invalid } })).ok).toBe(false);
  }
});
