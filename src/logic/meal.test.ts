import { describe, expect, it } from 'vitest';
import { createNewGame } from './gameState';
import { generateCustomerOrders, expectedPlate } from './orders';
import { seededRng } from './random';
import { ORDER_CONFIG } from '../data/orderConfig';
import { computePayment } from './payment';
import { binStatus } from './stock';
import { mealIngredients, mealPantry, mealPlate, mealReady, scoreMeal, type MealItem, type MealPlate } from './meal';
import { startToasting, stepToasting, takeFromToaster, untoasted } from './toasting';

const items: MealItem[] = [
  { customerId: 1, order: { recipeId: 'plainBread', modifiers: [], quantity: 1 } },
  { customerId: 1, order: { recipeId: 'jamBread', modifiers: ['toasted'], quantity: 1 } },
  { customerId: 2, order: { recipeId: 'mushroomBread', modifiers: [], quantity: 1 } },
];
const ready = (): MealPlate[] => items.map(item => ({ ...expectedPlate(item.order), ready: true }));

describe('independent dish requests', () => {
  it('can request two different dishes without a tray, each with quantity one', () => {
    const config = { ...ORDER_CONFIG, doubleOrderChance: 1 };
    const rng = seededRng(9);
    const pairs = Array.from({ length: 100 }, () => generateCustomerOrders(createNewGame(), rng, config));
    expect(pairs.every(pair => pair.length === 2 && pair.every(order => order.quantity === 1))).toBe(true);
    expect(pairs.some(([a, b]) => a.recipeId !== b.recipeId)).toBe(true);
    expect(pairs.some(([a, b]) => a.recipeId === b.recipeId)).toBe(true);
  });

  it('rolls modifiers and extras separately and respects single-dish odds', () => {
    const owned = { ingredients: ['bread', 'jam', 'mushroom'] as const, upgrades: ['toaster'] as const };
    const rng = seededRng(4);
    const pairs = Array.from({ length: 100 }, () => generateCustomerOrders(owned, rng, { ...ORDER_CONFIG, doubleOrderChance: 1 }));
    expect(pairs.some(([a, b]) => a.modifiers.length !== b.modifiers.length)).toBe(true);
    expect(pairs.some(([a, b]) => a.extraIngredient !== b.extraIngredient)).toBe(true);
    expect(generateCustomerOrders(owned, seededRng(1), { ...ORDER_CONFIG, doubleOrderChance: 0 })).toHaveLength(1);
  });
});

describe('preparing a meal without per-plate confirmation', () => {
  it('can serve two or four nonempty plates directly, without checking their recipe accuracy', () => {
    for (const count of [2, 4]) {
      const requests = Array.from({ length: count }, (_, i) => ({ ...items[0], customerId: i % 2 }));
      const drafts = requests.map(() => mealPlate(['bread'], untoasted()));
      expect(mealReady(requests, drafts)).toBe(true);
      expect(scoreMeal(requests, drafts, 1)?.every(s => s.result.score === 'perfect')).toBe(true);
      drafts[0] = mealPlate(['jam', 'jam', 'jam', 'jam'], untoasted());
      expect(mealReady(requests, drafts)).toBe(true);
      expect(scoreMeal(requests, drafts, 1)?.[0].result.score).toBe('wrong');
      drafts[0] = mealPlate([], untoasted());
      expect(mealReady(requests, drafts)).toBe(false);
    }
  });

  it('requires a toasted dish to return to its plate, then enables serving automatically', () => {
    const requests = items.slice(0, 2);
    const layers = ['bread', 'jam'] as const;
    const toasting = startToasting(untoasted());
    const popped = stepToasting(toasting, 100);
    const first = mealPlate(['bread'], untoasted());
    expect(mealReady(requests, [first, mealPlate(layers, toasting)])).toBe(false);
    expect(mealReady(requests, [first, mealPlate(layers, popped)])).toBe(false);
    const returned = mealPlate(layers, takeFromToaster(popped));
    expect(mealReady(requests, [first, returned])).toBe(true);
    expect(returned.modifiers).toEqual(['toasted']);
  });
});

describe('a prepared meal', () => {
  it('cannot serve until every nonempty plate is ready', () => {
    expect(mealReady(items, ready())).toBe(true);
    expect(scoreMeal(items, ready().slice(1), 1)).toBeNull();
    expect(scoreMeal(items, ready().map((plate, i) => i === 1 ? { ...plate, ready: false } : plate), 1)).toBeNull();
    expect(scoreMeal(items, ready().map((plate, i) => i === 1 ? { ...plate, layers: [] } : plate), 1)).toBeNull();
    expect(mealReady([], [])).toBe(false);
  });

  it('reserves other drafts and rush funds without changing real stock', () => {
    const original = createNewGame();
    const game = { ...original, stock: { ...original.stock, bread: 1 }, leaves: 2 };
    const snapshot = structuredClone(game);
    const plates = ready();
    const pantry = mealPantry(game, items, plates, 0)!;
    expect(pantry.stock.bread).toBe(0);
    expect(pantry.leaves).toBe(0);
    expect(binStatus(pantry, [], 'bread', 1).kind).toBe('out');
    expect(game).toEqual(snapshot);
    expect(mealPantry({ ...game, leaves: 0 }, items, plates, 0)).toBeNull();
    const released = mealPantry(game, items, plates.map((plate, i) => i === 1 ? { ...plate, layers: [] } : plate), 0)!;
    expect(binStatus(released, [], 'bread', 1).kind).toBe('rush');
  });

  it('pays per plate but reports a single result per animal', () => {
    const servings = scoreMeal(items, ready(), 1)!;
    expect(servings).toHaveLength(2);
    expect(servings.map(s => s.result.score)).toEqual(['perfect', 'perfect']);
    const expected = items.slice(0, 2).map(item => computePayment(item.order, { score: 'perfect', missingModifiers: [], extraModifiers: [] }, 1));
    expect(servings[0].payment.total).toBe(expected[0].total + expected[1].total);
    expect(mealIngredients(items, ready())).toEqual(['bread', 'bread', 'jam', 'bread', 'mushroom']);
    expect(scoreMeal(items, ready(), 0.1)![0].payment.tip).toBeLessThan(servings[0].payment.tip);
  });

  it('a wrong plate forfeits only its owner payment; the companion can still eat', () => {
    const plates = ready();
    plates[1] = { layers: ['mushroom', 'mushroom', 'mushroom', 'mushroom'], modifiers: [], ready: true };
    const servings = scoreMeal(items, plates, 1)!;
    expect(servings[0].result.score).toBe('wrong');
    expect(servings[0].payment.total).toBe(0);
    expect(servings[1].result.score).toBe('perfect');
    expect(servings[1].payment.total).toBeGreaterThan(0);
  });
});
