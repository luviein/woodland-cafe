import { describe, expect, it } from 'vitest';
import { SHOPS } from '../data/shops';
import { createNewGame, earnLeaves } from './gameState';
import { buyStock, canBuyStock, shopStandPoint, shopsAt, stockCost } from './shop';

const rich = () => earnLeaves(createNewGame(), 50);

describe('shopsAt', () => {
  it('lists the three Marketplace stalls, and none in the Forest', () => {
    expect(shopsAt('marketplace')).toEqual(['pantry', 'specialty', 'tools']);
    expect(shopsAt('forest')).toEqual([]);
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
