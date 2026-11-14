import { expect, it } from 'vitest';
import { SPRITE_ART } from '../art/spriteArt';
import { createNewGame } from './gameState';
import { buySeed } from './garden';
import { seedShopEntries } from './seedShop';

it('lists all six purchasable packets with registered artwork', () => {
  const state = { ...createNewGame(), leaves: 100, ingredients: ['bread', 'jam', 'mushroom', 'tomato', 'chilli'] as const };
  const rows = seedShopEntries(state, 'christmas');
  expect(rows.map(row => `${row.seed}.${row.crop}`)).toEqual([
    'normal.mushroom', 'normal.tomato', 'normal.chilli', 'christmas.mushroom', 'christmas.tomato', 'christmas.chilli',
  ]);
  expect(rows.every(row => row.enabled)).toBe(true);
  for (const row of rows) expect(SPRITE_ART).toHaveProperty(row.art);
});

it('shows purchased quantities from the matching seed stock and refreshes affordability', () => {
  const initial = { ...createNewGame(), leaves: 5 };
  const bought = buySeed(initial, 'mushroom', 'christmas', 'christmas');
  const rows = seedShopEntries(bought, 'christmas');
  expect(rows[0].owned).toBe(0);
  expect(rows[3].owned).toBe(1);
  expect(rows[3].enabled).toBe(false);
  expect(rows[3].locked).toBe(false);
  expect(rows[3].outOfSeason).toBe(false);
});

it('distinguishes ingredient locks and closed seasonal sales from an empty wallet', () => {
  const state = { ...createNewGame(), leaves: 100 };
  const rows = seedShopEntries(state, null);
  expect(rows[0]).toMatchObject({ enabled: true, locked: false, outOfSeason: false });
  expect(rows[1]).toMatchObject({ enabled: false, locked: true });
  expect(rows[3]).toMatchObject({ enabled: false, locked: false, outOfSeason: true });
});
