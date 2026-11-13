import { expect, it } from 'vitest';
import { CROP_IDS, SPECIAL_VARIANTS } from '../data/crops';
import { INGREDIENT_IDS } from '../data/ingredients';
import { SPRITE_ART } from '../art/spriteArt';
import { buySeed, plantCrop, tendCrop } from './garden';
import { createNewGame } from './gameState';
import { inventoryEntries } from './inventory';
import { loadGame, saveGame } from './save';

it('keeps all six special crops visible with separate zero-count entries', () => {
  const entries = inventoryEntries(createNewGame(), 'seasonal');
  expect(entries).toHaveLength(6);
  expect(entries.map(entry => entry.id)).toEqual(SPECIAL_VARIANTS.flatMap(variant => CROP_IDS.map(crop => `${variant}.${crop}`)));
  expect(entries.every(entry => entry.amount === 0 && !entry.locked)).toBe(true);
  for (const entry of entries) expect(SPRITE_ART).toHaveProperty(entry.art);
});

it('shows cooking stock and ingredient locks without exposing special crops as ingredients', () => {
  const state = createNewGame();
  state.garden.harvests.christmas.mushroom = 8;
  const entries = inventoryEntries(state, 'ingredients');
  expect(entries.map(entry => entry.id)).toEqual(INGREDIENT_IDS);
  expect(entries.find(entry => entry.id === 'mushroom')).toMatchObject({ amount: state.stock.mushroom, locked: false, art: 'mushroom' });
  expect(entries.find(entry => entry.id === 'tomato')).toMatchObject({ amount: 0, locked: true });
  expect(entries.some(entry => entry.name.includes('Christmas') || entry.name.includes('Golden'))).toBe(false);
});

it('reads the saved harvest quantity after harvesting and reloading, including outside an event', () => {
  const state = buySeed({ ...createNewGame(), leaves: 5 }, 'mushroom', 'christmas', 'christmas');
  const planted = plantCrop(state, 0, 'mushroom', 'christmas', null);
  const harvested = tendCrop(tendCrop(planted, 0, 1000), 0, 301000, 0);
  const result = loadGame(saveGame(harvested));
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  const special = inventoryEntries(result.state, 'seasonal');
  expect(special.find(entry => entry.id === 'christmas.mushroom')).toMatchObject({ name: 'Christmas Mushroom', art: 'mushroomChristmas', amount: 8 });
  expect(special.find(entry => entry.id === 'golden.mushroom')?.amount).toBe(0);
  expect(inventoryEntries(result.state, 'ingredients').find(entry => entry.id === 'mushroom')?.amount).toBe(state.stock.mushroom);
});

it('refreshes counts from current state without spending, transferring or changing saved data', () => {
  const state = createNewGame();
  const before = saveGame(state);
  inventoryEntries(state, 'seasonal');
  inventoryEntries(state, 'ingredients');
  expect(saveGame(state)).toBe(before);
  const updated = { ...state, garden: { ...state.garden, harvests: { ...state.garden.harvests,
    golden: { ...state.garden.harvests.golden, tomato: 4 } } } };
  const entry = inventoryEntries(updated, 'seasonal').find(entry => entry.id === 'golden.tomato')!;
  expect(entry.amount).toBe(4);
  entry.amount = 0;
  expect(updated.garden.harvests.golden.tomato).toBe(4);
});
