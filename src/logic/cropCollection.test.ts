import { expect, it } from 'vitest';
import { COLLECTION_ITEMS, COLLECTION_IDS, donateCrop } from './cropCollection';
import { createNewGame } from './gameState';
import { loadGame, saveGame } from './save';

it('donates exactly one of each special crop once, keeping the remaining crops and wallets', () => {
  const original = { ...createNewGame(), leaves: 123, christmasTickets: 45 };
  for (const item of COLLECTION_ITEMS) original.garden.harvests[item.variant][item.crop] = 4;
  let state = original;
  for (const item of COLLECTION_ITEMS) {
    const before = state;
    state = donateCrop(state, item.id);
    expect(state.cropCollection).toContain(item.id);
    expect(state.cropCollection.length).toBe(before.cropCollection.length + 1);
    expect(state.garden.harvests).toEqual({ ...before.garden.harvests,
      [item.variant]: { ...before.garden.harvests[item.variant], [item.crop]: 3 },
    });
    expect(donateCrop(state, item.id)).toBe(state);
    expect(original.garden.harvests[item.variant][item.crop]).toBe(4);
  }
  expect(state.cropCollection).toEqual(COLLECTION_IDS);
  expect(state.stock).toEqual(original.stock);
  expect(state.leaves).toBe(123);
  expect(state.christmasTickets).toBe(45);
  expect(original.cropCollection).toEqual([]);
  expect(loadGame(saveGame(state))).toEqual({ ok: true, state });
});

it('cannot donate missing special crops or ordinary cooking stock', () => {
  const state = createNewGame();
  for (const item of COLLECTION_ITEMS) expect(donateCrop(state, item.id)).toBe(state);
  expect(donateCrop(state, 'ordinary.mushroom' as never)).toBe(state);
  expect(donateCrop(state, 'unknown' as never)).toBe(state);
});

it('migrates older saves without losing crops or tickets and sanitises saved collection ids', () => {
  const state = { ...createNewGame(), christmasTickets: 22 };
  state.garden.harvests.christmas.tomato = 8;
  const { cropCollection: _collection, ...old } = state;
  expect(loadGame(JSON.stringify({ version: 15, state: old }))).toEqual({ ok: true, state });
  expect(loadGame(JSON.stringify({ version: 16, state: { ...state,
    cropCollection: ['removed.crop', 'christmas.tomato', 'christmas.tomato', 'golden.mushroom'],
  } }))).toEqual({ ok: true, state: { ...state, cropCollection: ['golden.mushroom', 'christmas.tomato'] } });
  for (const invalid of [null, 1, 'golden.mushroom', {}]) {
    expect(loadGame(JSON.stringify({ version: 16, state: { ...state, cropCollection: invalid } })).ok).toBe(false);
  }
});
