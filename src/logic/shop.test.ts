import { describe, expect, it } from 'vitest';
import { SHOPS } from '../data/shops';
import { createNewGame, earnLeaves } from './gameState';
import { availableModifiers, availableRecipes } from './orders';
import {
  buyFurniture,
  buyStock,
  buyUpgrade,
  canBuyFurniture,
  canBuyStock,
  canBuyUpgrade,
  canUnlock,
  newRecipesWith,
  shopStandPoint,
  shopsAt,
  inSeason,
  stockCost,
  unlockableIngredients,
  unlockIngredient,
} from './shop';

const rich = () => earnLeaves(createNewGame(), 50);

describe('shopsAt', () => {
  it('lists the five Marketplace stalls, and none in the Forest', () => {
    const november = new Date(2026, 10, 30);
    expect(shopsAt('marketplace', november)).toEqual(['pantry', 'specialty', 'tools', 'carpenter', 'noticeBoard']);
    expect(shopsAt('forest', november)).toEqual([]);
  });

  it('the Christmas stall only in December, or all year while testing', () => {
    const at = (month: number, day: number) => shopsAt('marketplace', new Date(2026, month - 1, day)).includes('christmas');
    expect(at(11, 30)).toBe(false);
    expect(at(12, 1)).toBe(true);
    expect(at(12, 31)).toBe(true);
    expect(at(1, 1)).toBe(false);
    expect(shopsAt('marketplace', new Date(2026, 5, 1), true)).toContain('christmas');
  });

  it('a season can run over New Year', () => {
    const winter = { ...SHOPS.pantry, season: { from: { month: 12, day: 20 }, to: { month: 1, day: 6 } } };
    expect(inSeason(winter, new Date(2026, 11, 25))).toBe(true);
    expect(inSeason(winter, new Date(2027, 0, 6))).toBe(true);
    expect(inSeason(winter, new Date(2027, 0, 7))).toBe(false);
    expect(inSeason(winter, new Date(2026, 11, 19))).toBe(false);
  });

  it('the stand point is in front of (below) the counter', () => {
    const p = shopStandPoint('pantry');
    expect(p.x).toBe(SHOPS.pantry.stall.x);
    expect(p.y).toBeGreaterThan(SHOPS.pantry.stall.y);
  });
});

describe('buying stock', () => {
  it('costs the unit price per unit', () => {
    expect(stockCost('bread', 10)).toBe(10);
    expect(stockCost('tuna', 1)).toBe(3);
  });

  it('adds to stock and takes the Leaves, leaving the old state alone', () => {
    const before = rich();
    const after = buyStock(before, 'jam', 10);
    expect(after.stock.jam).toBe(before.stock.jam + 10);
    expect(after.leaves).toBe(40);
    expect(before.leaves).toBe(50);
  });

  it('can buy with exactly enough Leaves, not with one too few', () => {
    const state = earnLeaves(createNewGame(), 9);
    expect(canBuyStock(state, 'bread', 1)).toBe(true);
    expect(canBuyStock(state, 'bread', 10)).toBe(false);
    expect(buyStock(state, 'bread', 9).leaves).toBe(0);
    expect(() => buyStock(state, 'bread', 10)).toThrow(/can't pay/);
  });

  it("can't buy stock of an ingredient that isn't owned yet", () => {
    expect(canBuyStock(rich(), 'tuna', 1)).toBe(false);
    expect(() => buyStock(rich(), 'tuna', 1)).toThrow(/isn't owned/);
  });
});

describe('buying upgrades', () => {
  it('costs its price and is owned from then on', () => {
    const state = buyUpgrade(rich(), 'toaster');
    expect(state.upgrades).toEqual(['toaster']);
    expect(state.leaves).toBe(20);
    expect(canBuyUpgrade(state, 'toaster')).toBe(false);
    expect(() => buyUpgrade(state, 'toaster')).toThrow(/already owned/);
  });

  it("can't be bought with too few Leaves", () => {
    expect(canBuyUpgrade(earnLeaves(createNewGame(), 29), 'toaster')).toBe(false);
    expect(() => buyUpgrade(earnLeaves(createNewGame(), 29), 'toaster')).toThrow(/can't pay/);
  });

  it('owning the Toaster lets orders be toasted', () => {
    const owned = buyUpgrade(rich(), 'toaster');
    expect(availableModifiers('jamBread', owned)).toContain('toasted');
    expect(availableModifiers('jamBread', rich())).not.toContain('toasted');
  });
});

describe('buying furniture', () => {
  it('costs its price and goes into storage, not the cafe', () => {
    const before = rich();
    const after = buyFurniture(buyFurniture(before, 'chair'), 'table');
    expect(after.leaves).toBe(10);
    expect(after.furniture.stored).toMatchObject({ table: 1, chair: 1, chairWithBow: 0 });
    expect(after.furniture.placed).toEqual(before.furniture.placed);
  });

  it("can't be bought with too few Leaves", () => {
    const poor = earnLeaves(createNewGame(), 29);
    expect(canBuyFurniture(poor, 'chair')).toBe(true);
    expect(canBuyFurniture(poor, 'table')).toBe(false);
    expect(() => buyFurniture(poor, 'table')).toThrow(/can't pay/);
  });
});

describe('unlocking ingredients', () => {
  it('the Specialty stall sells chilli, tuna and tomato, not the starters', () => {
    expect(unlockableIngredients()).toEqual(['chilli', 'tuna', 'tomato']);
  });

  it('costs the unlock price, adds no stock, and opens its recipes', () => {
    const before = rich();
    const after = unlockIngredient(before, 'tomato');
    expect(after.leaves).toBe(40);
    expect(after.stock.tomato).toBe(0);
    expect(availableRecipes(after)).toContain('tomatoBread');
    expect(before.ingredients).not.toContain('tomato');
  });

  it('keeps owned ingredients in catalogue order, whatever order they were bought in', () => {
    const state = unlockIngredient(unlockIngredient(rich(), 'tomato'), 'chilli');
    expect(state.ingredients).toEqual(['bread', 'mushroom', 'jam', 'chilli', 'tomato']);
  });

  it("can't unlock a starter, something owned, or with too few Leaves", () => {
    const owned = unlockIngredient(rich(), 'tuna');
    expect(canUnlock(owned, 'tuna')).toBe(false);
    expect(() => unlockIngredient(owned, 'tuna')).toThrow(/already owned/);
    expect(canUnlock(rich(), 'bread')).toBe(false);
    expect(() => unlockIngredient(rich(), 'bread')).toThrow(/isn't for sale/);
    const poor = earnLeaves(createNewGame(), 14);
    expect(canUnlock(poor, 'chilli')).toBe(false);
    expect(canUnlock(earnLeaves(poor, 1), 'chilli')).toBe(true);
  });

  it('counts the recipes an unlock would add', () => {
    const state = rich();
    expect(newRecipesWith(state, 'tuna')).toBe(1); // Tuna Sandwich (the others need tomato or chilli too)
    expect(newRecipesWith(unlockIngredient(state, 'tomato'), 'tuna')).toBe(2); // + Tuna Tomato Sandwich
    expect(newRecipesWith(unlockIngredient(state, 'tuna'), 'tuna')).toBe(0);
  });
});
