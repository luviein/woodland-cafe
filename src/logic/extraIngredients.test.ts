import { describe, expect, it } from 'vitest';
import { INGREDIENT_IDS, INGREDIENTS } from '../data/ingredients';
import { ORDER_CONFIG } from '../data/orderConfig';
import { RECIPES } from '../data/recipes';
import { EXTRA_INGREDIENT_LINES, RECIPE_LINES } from '../data/dialogue';
import { customerProblems } from '../data/texts/rules';
import CUSTOMERS from '../data/texts/customers.json';
import { buildSpeech } from './dialogue';
import { availableRecipes, expectedPlate, generateOrder } from './orders';
import { seededRng } from './random';
import { scoreDish } from './scoreDish';
import { computePayment } from './payment';
import { canMakeOrder, orderIngredients, startingStock, useIngredients } from './stock';
import type { Order } from './types';

const sandwich: Order = { recipeId: 'tunaSandwich', modifiers: ['toasted'], quantity: 1, extraIngredient: 'mushroom' };

describe('extra ingredient orders', () => {
  it('uses the agreed 50% chance with both outcomes over repeatable orders', () => {
    expect(ORDER_CONFIG.extraIngredientChance).toBe(0.5);
    const rng = seededRng(28);
    let extras = 0;
    for (let i = 0; i < 1000; i++) {
      const order = generateOrder({ ingredients: ['bread', 'jam', 'mushroom'], upgrades: [] }, rng);
      if (order.extraIngredient) extras++;
    }
    expect(extras).toBeGreaterThan(430);
    expect(extras).toBeLessThan(570);
  });

  it('only requests owned fillings absent from the recipe, including unusual combinations', () => {
    const rng = seededRng(9);
    const seen = new Set<string>();
    for (let i = 0; i < 500; i++) {
      const order = generateOrder({ ingredients: ['bread', 'jam', 'tuna'], upgrades: [] }, rng,
        { ...ORDER_CONFIG, extraIngredientChance: 1 });
      expect(['jam', 'tuna']).toContain(order.extraIngredient);
      expect(RECIPES[order.recipeId].layers).not.toContain(order.extraIngredient);
      if (order.recipeId === 'tunaSandwich') seen.add(order.extraIngredient!);
    }
    expect(seen.has('jam')).toBe(true);
  });

  it('skips extras when disabled or when no eligible filling is owned', () => {
    expect(generateOrder({ ingredients: ['bread'], upgrades: [] }, () => 0,
      { ...ORDER_CONFIG, extraIngredientChance: 1 }).extraIngredient).toBeUndefined();
    expect(generateOrder({ ingredients: INGREDIENT_IDS, upgrades: [] }, () => 0,
      { ...ORDER_CONFIG, extraIngredientChance: 0 }).extraIngredient).toBeUndefined();
  });

  it('keeps sandwich bread in place and permits either filling order', () => {
    const expected = expectedPlate(sandwich);
    expect(expected.layers).toEqual(['bread', 'tuna', 'mushroom', 'bread']);
    expect(scoreDish(expected, { layers: ['bread', 'mushroom', 'tuna', 'bread'], modifiers: ['toasted'] }).score).toBe('perfect');
    expect(scoreDish(expected, { layers: ['bread', 'tuna', 'bread'], modifiers: ['toasted'] }).score).toBe('close');
    expect(RECIPES.tunaSandwich.layers).toEqual(['bread', 'tuna', 'bread']);
    expect(expectedPlate({ ...sandwich, recipeId: 'tunaBread' }).layers).toEqual(['bread', 'tuna', 'mushroom']);
  });

  it('speaks the explicit extra after both direct and hint base requests', () => {
    for (const ratio of [0, 1]) {
      const lines = buildSpeech(sandwich, ratio, () => 0);
      expect(lines[0]).toBe(ratio ? RECIPE_LINES.tunaSandwich.hint[0] : RECIPE_LINES.tunaSandwich.direct[0]);
      expect(EXTRA_INGREDIENT_LINES.mushroom.direct).toContain(lines[1]);
      expect(lines).toHaveLength(3);
    }
  });

  it('includes the extra in stock checks, double orders and actual consumption', () => {
    const order = { ...sandwich, quantity: 2 };
    const ingredients = orderIngredients(order);
    expect(ingredients.filter((id) => id === 'mushroom')).toHaveLength(2);
    const pantry = { leaves: 0, stock: { ...startingStock(), tuna: 10, mushroom: 0 } };
    expect(canMakeOrder(pantry, order)).toBe(false);
    const stocked = { ...pantry, stock: { ...pantry.stock, mushroom: 3 } };
    expect(canMakeOrder(stocked, order)).toBe(true);
    expect(useIngredients(stocked, ingredients).state.stock.mushroom).toBe(1);
  });

  it('charges for the extra on each dish, with no payment for a wrong dish', () => {
    const result = { score: 'perfect' as const, missingModifiers: [], extraModifiers: [] };
    const base = computePayment({ ...sandwich, extraIngredient: undefined }, result, 0).price;
    expect(computePayment({ ...sandwich, quantity: 2 }, result, 0).price)
      .toBe((base + 2 * INGREDIENTS.mushroom.unitPrice) * 2);
    expect(computePayment(sandwich, { ...result, score: 'wrong' }, 1).total).toBe(0);
  });

  it('unlocks the four new recipes only when all their ingredients are owned', () => {
    const recipes = availableRecipes({ ingredients: ['bread', 'tuna', 'tomato', 'mushroom'], upgrades: [] });
    expect(recipes).toEqual(expect.arrayContaining(['tunaBread', 'tomatoSandwich', 'mushroomTomatoBread']));
    expect(recipes).not.toContain('spicyTomatoBread');
    expect(availableRecipes({ ingredients: ['bread', 'tomato', 'chilli'], upgrades: [] })).toContain('spicyTomatoBread');
  });

  it('validates supplementary text for every eligible ingredient', () => {
    const texts = structuredClone(CUSTOMERS);
    texts.extraIngredients.mushroom.direct = [];
    expect(customerProblems(texts)).toContain('Extra ingredient mushroom: needs at least one direct line');
  });
});
