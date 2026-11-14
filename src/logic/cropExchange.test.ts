import { expect, it } from 'vitest';
import { CROP_IDS } from '../data/crops';
import { createNewGame } from './gameState';
import { exchangeCrop, sellChristmasCrop } from './cropExchange';
import { loadGame, saveGame } from './save';

it('sells one or all of the chosen Christmas crop at 1/2/3 tickets, preserving other stock', () => {
  for (const [i, crop] of CROP_IDS.entries()) {
    const original = createNewGame();
    original.garden.harvests.christmas = { mushroom: 4, tomato: 4, chilli: 4 };
    original.garden.harvests.golden[crop] = 8;
    const one = sellChristmasCrop(original, crop, 1);
    expect(one.christmasTickets).toBe(i + 1);
    expect(one.garden.harvests.christmas).toEqual({ ...original.garden.harvests.christmas, [crop]: 3 });
    const all = sellChristmasCrop(one, crop, 'all');
    expect(all.christmasTickets).toBe(4 * (i + 1));
    expect(all.garden.harvests.christmas[crop]).toBe(0);
    expect(all.garden.harvests.golden).toEqual(original.garden.harvests.golden);
    expect(all.stock).toEqual(original.stock);
    expect(all.leaves).toBe(original.leaves);
    expect(original.garden.harvests.christmas[crop]).toBe(4);
    expect(sellChristmasCrop(all, crop, 'all')).toBe(all);
  }
  expect(exchangeCrop('golden.mushroom')).toBeUndefined();
  expect(exchangeCrop('mushroom')).toBeUndefined();
  expect(exchangeCrop('christmas.tomato')).toBe('tomato');
});

it('rejects invalid quantities, overselling and unsafe ticket balances atomically', () => {
  const state = createNewGame();
  state.garden.harvests.christmas.chilli = 4;
  for (const amount of [0, -1, 0.5, 5, NaN, Infinity]) expect(sellChristmasCrop(state, 'chilli', amount)).toBe(state);
  const full = { ...state, christmasTickets: Number.MAX_SAFE_INTEGER };
  expect(sellChristmasCrop(full, 'chilli', 1)).toBe(full);
});

it('saves tickets with the remaining crops, migrates old saves and rejects malformed balances', () => {
  const state = createNewGame();
  state.garden.harvests.christmas.tomato = 4;
  const sold = sellChristmasCrop(state, 'tomato', 1);
  expect(loadGame(saveGame(sold))).toEqual({ ok: true, state: sold });
  const { christmasTickets: _tickets, ...old } = state;
  expect(loadGame(JSON.stringify({ version: 14, state: old }))).toEqual({ ok: true, state });
  for (const tickets of [-1, 0.5, '5', null, Number.MAX_SAFE_INTEGER + 1]) {
    expect(loadGame(JSON.stringify({ version: 15, state: { ...state, christmasTickets: tickets } })).ok).toBe(false);
  }
});
