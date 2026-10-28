import { describe, expect, it } from 'vitest';
import { STARTER_INGREDIENTS } from '../data/ingredients';
import type { OrderConfig } from '../data/orderConfig';
import { RECIPES } from '../data/recipes';
import {
  availableModifiers,
  availableRecipes,
  expectedPlate,
  generateOrder,
  type Owned,
} from './orders';
import { seededRng } from './random';

const STARTER: Owned = { ingredients: STARTER_INGREDIENTS, upgrades: [] };

const STARTER_RECIPES = [
  'plainBread',
  'jamBread',
  'extraJammyBread',
  'mushroomBread',
  'doubleMushroomBread',
  'mushroomSandwich',
  'jamSandwich',
];

// Config that always adds every modifier it can and always doubles, so tests
// don't depend on luck.
const ALWAYS: OrderConfig = {
  hintRatio: 0,
  modifierChance: 1,
  maxModifiers: 10,
  doubleOrderChance: 1,
};

describe('availableRecipes', () => {
  it('starter ingredients unlock exactly the 7 starter recipes', () => {
    expect(availableRecipes(STARTER)).toEqual(STARTER_RECIPES);
  });

  it('a purchased ingredient unlocks only recipes it completes', () => {
    const owned: Owned = { ingredients: [...STARTER_INGREDIENTS, 'tomato'], upgrades: [] };
    const recipes = availableRecipes(owned);
    expect(recipes).toContain('tomatoBread');
    // Tuna Tomato Sandwich also needs tuna, so it stays locked.
    expect(recipes).not.toContain('tunaTomatoSandwich');
  });

  it('a recipe needing two purchases only unlocks once both are owned', () => {
    const tunaOnly: Owned = { ingredients: [...STARTER_INGREDIENTS, 'tuna'], upgrades: [] };
    expect(availableRecipes(tunaOnly)).not.toContain('spicyTunaBread');

    const both: Owned = { ingredients: [...STARTER_INGREDIENTS, 'tuna', 'chilli'], upgrades: [] };
    expect(availableRecipes(both)).toContain('spicyTunaBread');
  });
});

describe('availableModifiers', () => {
  it('none without upgrades', () => {
    expect(availableModifiers('jamBread', STARTER)).toEqual([]);
  });

  it('toaster unlocks "toasted" for bread recipes', () => {
    const owned: Owned = { ...STARTER, upgrades: ['toaster'] };
    expect(availableModifiers('plainBread', owned)).toEqual(['toasted']);
  });

  it('grill pan only applies to recipes with mushroom, tomato or tuna', () => {
    const owned: Owned = { ...STARTER, upgrades: ['grillPan'] };
    expect(availableModifiers('mushroomBread', owned)).toEqual(['grilled']);
    expect(availableModifiers('jamBread', owned)).toEqual([]);
  });

  it('sandwich press only applies to sandwiches', () => {
    const owned: Owned = { ...STARTER, upgrades: ['sandwichPress'] };
    expect(availableModifiers('jamSandwich', owned)).toEqual(['pressed']);
    expect(availableModifiers('jamBread', owned)).toEqual([]);
  });
});

describe('generateOrder', () => {
  it('is repeatable with the same seed', () => {
    expect(generateOrder(STARTER, seededRng(42))).toEqual(generateOrder(STARTER, seededRng(42)));
  });

  it('with starter state: always a starter recipe, no modifiers, single quantity', () => {
    const rng = seededRng(1);
    const seen = new Set<string>();
    for (let i = 0; i < 500; i++) {
      const order = generateOrder(STARTER, rng);
      expect(STARTER_RECIPES).toContain(order.recipeId);
      expect(order.modifiers).toEqual([]);
      expect(order.quantity).toBe(1);
      seen.add(order.recipeId);
    }
    // Over 500 orders, every starter recipe should come up at least once.
    expect(seen.size).toBe(STARTER_RECIPES.length);
  });

  it('adds unlocked modifiers that fit the recipe', () => {
    const owned: Owned = { ...STARTER, upgrades: ['toaster'] };
    const order = generateOrder(owned, seededRng(7), ALWAYS);
    expect(order.modifiers).toEqual(['toasted']);
  });

  it('never adds more than maxModifiers', () => {
    const owned: Owned = { ...STARTER, upgrades: ['toaster', 'butterChurn', 'seasoningShaker'] };
    const rng = seededRng(3);
    for (let i = 0; i < 100; i++) {
      expect(generateOrder(owned, rng, { ...ALWAYS, maxModifiers: 2 }).modifiers).toHaveLength(2);
    }
  });

  it('only makes double orders once the Serving Tray is owned', () => {
    expect(generateOrder(STARTER, seededRng(5), ALWAYS).quantity).toBe(1);
    const owned: Owned = { ...STARTER, upgrades: ['servingTray'] };
    expect(generateOrder(owned, seededRng(5), ALWAYS).quantity).toBe(2);
  });

  it('throws if no recipe can be made', () => {
    expect(() => generateOrder({ ingredients: ['jam'], upgrades: [] })).toThrow();
  });
});

describe('expectedPlate', () => {
  it("uses the recipe's ingredients and the order's modifiers", () => {
    const plate = expectedPlate({ recipeId: 'jamBread', modifiers: ['toasted'], quantity: 1 });
    expect(plate).toEqual({ ingredients: RECIPES.jamBread.ingredients, modifiers: ['toasted'] });
  });
});
