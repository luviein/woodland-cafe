import { expect, it } from 'vitest';
import { SPRITE_ART } from '../art/spriteArt';
import { createNewGame } from './gameState';
import { inventoryEntries } from './inventory';

it('keeps all six special crops visible with separate zero-count entries', () => {
  const entries = inventoryEntries(createNewGame(), 'seasonal');
  expect(entries).toHaveLength(6);
  expect(entries.every(entry => entry.amount === 0 && !entry.locked)).toBe(true);
  for (const entry of entries) expect(SPRITE_ART).toHaveProperty(entry.art);
});

it('shows cooking stock and ingredient locks without exposing special crops as ingredients', () => {
  const state = createNewGame();
  state.garden.harvests.christmas.mushroom = 8;
  state.garden.harvests.golden.tomato = 4;
  const entries = inventoryEntries(state, 'ingredients');
  expect(entries).toHaveLength(6);
  expect(entries.find(entry => entry.id === 'mushroom')).toMatchObject({ amount: state.stock.mushroom, locked: false, art: 'mushroom' });
  expect(entries.find(entry => entry.id === 'tomato')).toMatchObject({ amount: 0, locked: true });
  expect(entries.some(entry => entry.name.includes('Christmas') || entry.name.includes('Golden'))).toBe(false);
  const special = inventoryEntries(state, 'seasonal');
  expect(special.find(entry => entry.id === 'christmas.mushroom')).toMatchObject({ name: 'Christmas Mushroom', art: 'mushroomChristmas', amount: 8 });
  expect(special.find(entry => entry.id === 'golden.tomato')).toMatchObject({ art: 'tomatoGolden', amount: 4 });
});
