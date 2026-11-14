import { expect, it } from 'vitest';
import { CHRISTMAS_CATALOGUE } from '../data/furniture';
import { catalogueProduct, isClothingItem } from '../data/catalogueProducts';
import { isFinishItem } from '../data/roomFinishProducts';
import { createNewGame } from './gameState';
import { buyChristmasItem, canBuyChristmasItem } from './christmasShop';
import { loadGame, saveGame } from './save';

it('charges existing catalogue prices in tickets and preserves ownership rules', () => {
  for (const id of CHRISTMAS_CATALOGUE.tabs.flatMap(tab => [...tab.designs])) {
    const original = { ...createNewGame(), leaves: 123, christmasTickets: catalogueProduct(id).price,
      ownedClothing: [], ownedFinishes: [] };
    const bought = buyChristmasItem(original, id);
    expect(bought.christmasTickets, id).toBe(0);
    expect(bought.leaves).toBe(123);
    expect(original.christmasTickets).toBe(catalogueProduct(id).price);
    if (isFinishItem(id)) expect(bought.ownedFinishes).toContain(id);
    else if (isClothingItem(id)) expect(bought.ownedClothing).toContain(id);
    else expect(bought.furniture.stored[id]).toBe(original.furniture.stored[id] + 1);
    expect(loadGame(saveGame(bought))).toEqual({ ok: true, state: bought });
    const funded = { ...bought, christmasTickets: 10000 };
    expect(canBuyChristmasItem(funded, id)).toBe(!catalogueProduct(id).unique);
    if (catalogueProduct(id).unique) expect(() => buyChristmasItem(funded, id)).toThrow();
    else expect(buyChristmasItem(funded, id).christmasTickets).toBe(10000 - catalogueProduct(id).price);
    const poor = { ...original, leaves: 10000, christmasTickets: original.christmasTickets - 1 };
    expect(canBuyChristmasItem(poor, id)).toBe(false);
    expect(() => buyChristmasItem(poor, id)).toThrow();
  }
});

it('cannot buy ordinary Carpenter products through the ticket catalogue', () => {
  const state = { ...createNewGame(), christmasTickets: 10000 };
  expect(canBuyChristmasItem(state, 'table')).toBe(false);
  expect(() => buyChristmasItem(state, 'table')).toThrow();
});
