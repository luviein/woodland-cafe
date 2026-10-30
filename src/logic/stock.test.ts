import { describe, expect, it } from 'vitest';
import type { StockConfig } from '../data/stockConfig';
import {
  binStatus,
  canMakeOrder,
  missingIngredient,
  orderIngredients,
  planIngredients,
  plateIngredients,
  rushPrice,
  startingStock,
  useIngredients,
  type Pantry,
  type Stock,
} from './stock';

// Fixed config so the tests don't change when the game is retuned.
const CONFIG: StockConfig = { rushPriceMultiplier: 2 };
const NONE: Stock = { bread: 0, mushroom: 0, jam: 0, chilli: 0, tuna: 0, tomato: 0 };
const pantry = (stock: Partial<Stock>, leaves = 0): Pantry => ({ stock: { ...NONE, ...stock }, leaves });

describe('startingStock / rushPrice', () => {
  it('starts with the starter ingredients only', () => {
    expect(startingStock()).toEqual({ bread: 30, mushroom: 30, jam: 30, chilli: 0, tuna: 0, tomato: 0 });
  });

  it('rush costs the unit price times the multiplier', () => {
    expect(rushPrice('bread', CONFIG)).toBe(2); // unit price 1
    expect(rushPrice('tuna', CONFIG)).toBe(6); // unit price 3
  });
});

describe('plateIngredients / orderIngredients', () => {
  it('a double order needs everything twice', () => {
    expect(plateIngredients(['bread', 'jam'], 2)).toEqual(['bread', 'jam', 'bread', 'jam']);
    expect(orderIngredients({ recipeId: 'jamBread', modifiers: [], quantity: 1 })).toEqual(['bread', 'jam']);
  });
});

describe('planIngredients', () => {
  it('uses stock first, in the order ingredients appear', () => {
    const plan = planIngredients(pantry({ bread: 5, jam: 5 }), ['bread', 'jam', 'bread'], CONFIG);
    expect(plan).toEqual({
      uses: [
        { id: 'bread', fromStock: 2, rushed: 0 },
        { id: 'jam', fromStock: 1, rushed: 0 },
      ],
      rushCost: 0,
    });
  });

  it('rush-buys what stock is missing', () => {
    const plan = planIngredients(pantry({ bread: 1 }, 10), ['bread', 'jam', 'bread'], CONFIG);
    expect(plan).toEqual({
      uses: [
        { id: 'bread', fromStock: 1, rushed: 1 },
        { id: 'jam', fromStock: 0, rushed: 1 },
      ],
      rushCost: 4,
    });
  });

  it("null when the wallet can't pay for the rush (exactly enough is fine)", () => {
    expect(planIngredients(pantry({}, 3), ['bread', 'jam'], CONFIG)).toBeNull();
    expect(planIngredients(pantry({}, 4), ['bread', 'jam'], CONFIG)?.rushCost).toBe(4);
  });
});

describe('canMakeOrder / missingIngredient', () => {
  const jamBread = { recipeId: 'jamBread' as const, modifiers: [], quantity: 1 };

  it('with stock, or with Leaves for the rush', () => {
    expect(canMakeOrder(pantry({ bread: 1, jam: 1 }), jamBread, CONFIG)).toBe(true);
    expect(canMakeOrder(pantry({ bread: 1 }, 2), jamBread, CONFIG)).toBe(true);
    expect(canMakeOrder(pantry({ bread: 1 }, 1), jamBread, CONFIG)).toBe(false);
  });

  it('a double order needs twice the stock', () => {
    expect(canMakeOrder(pantry({ bread: 1, jam: 1 }), { ...jamBread, quantity: 2 }, CONFIG)).toBe(false);
  });

  it('names the first ingredient that ran short', () => {
    expect(missingIngredient(pantry({ bread: 1 }), ['bread', 'jam'], CONFIG)).toBe('jam');
    expect(missingIngredient(pantry({ bread: 1, jam: 1 }), ['bread', 'jam'], CONFIG)).toBeNull();
  });
});

describe('binStatus', () => {
  it('shows the stock left, not counting layers already on the plate', () => {
    expect(binStatus(pantry({ jam: 3 }), ['jam'], 'jam', 1, CONFIG)).toEqual({ kind: 'stock', left: 2 });
  });

  it('a double order reserves each layer twice', () => {
    expect(binStatus(pantry({ jam: 5 }), ['jam'], 'jam', 2, CONFIG)).toEqual({ kind: 'stock', left: 3 });
  });

  it('shows the rush price once stock runs out, if the wallet can pay', () => {
    expect(binStatus(pantry({ jam: 1 }, 2), ['jam'], 'jam', 1, CONFIG)).toEqual({ kind: 'rush', price: 2 });
  });

  it("out when it can't be stocked or paid for", () => {
    expect(binStatus(pantry({ jam: 1 }, 1), ['jam'], 'jam', 1, CONFIG)).toEqual({ kind: 'out' });
  });

  it('counts the rush cost of layers already on the plate', () => {
    // 2 Leaves pay for one rushed jam already on the plate; nothing left for bread.
    expect(binStatus(pantry({}, 2), ['jam'], 'bread', 1, CONFIG)).toEqual({ kind: 'out' });
  });
});

describe('useIngredients', () => {
  it('takes from stock and pays for the rush, keeping other fields', () => {
    const before = { ...pantry({ bread: 1 }, 10), day: 3 };
    const { state, plan } = useIngredients(before, ['bread', 'bread', 'jam'], CONFIG);
    expect(state).toEqual({ stock: { ...NONE, bread: 0 }, leaves: 6, day: 3 });
    expect(plan.rushCost).toBe(4);
    expect(before.stock.bread).toBe(1); // untouched
  });

  it("throws when it can't be paid for", () => {
    expect(() => useIngredients(pantry({}, 0), ['bread'], CONFIG)).toThrow(/can't pay/);
  });
});
