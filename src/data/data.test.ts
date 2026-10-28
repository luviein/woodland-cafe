import { describe, expect, it } from 'vitest';
import { recipeMatchesFilter } from '../logic/orders';
import { INGREDIENT_LINES, MODIFIER_LINES, RECIPE_LINES } from './dialogue';
import { INGREDIENT_IDS, INGREDIENTS, STARTER_INGREDIENTS } from './ingredients';
import { MODIFIER_IDS, MODIFIERS } from './modifiers';
import { RECIPE_IDS, RECIPES } from './recipes';

// TypeScript already checks that ids line up. These tests catch the mistakes
// the compiler can't: empty lists, zero counts, rules that match nothing.
// They act as a safety net when editing data files by hand.

describe('ingredients', () => {
  it('starters are bread, mushroom and jam', () => {
    expect(STARTER_INGREDIENTS).toEqual(['bread', 'mushroom', 'jam']);
  });

  it('purchasable ingredients have a price', () => {
    for (const id of INGREDIENT_IDS) {
      if (!INGREDIENTS[id].starter) expect(INGREDIENTS[id].price, id).toBeGreaterThan(0);
    }
  });
});

describe('recipes', () => {
  it('every recipe uses whole, positive counts', () => {
    for (const id of RECIPE_IDS) {
      const counts = Object.values(RECIPES[id].ingredients);
      expect(counts.length, id).toBeGreaterThan(0);
      for (const n of counts) expect(Number.isInteger(n) && n > 0, id).toBe(true);
    }
  });

  it('"sandwich" tag matches recipes made with two slices of bread', () => {
    for (const id of RECIPE_IDS) {
      const recipe = RECIPES[id];
      const isSandwich = (recipe.tags as readonly string[]).includes('sandwich');
      expect(isSandwich, id).toBe((recipe.ingredients as { bread?: number }).bread === 2);
    }
  });
});

describe('modifiers', () => {
  it('every modifier applies to at least one recipe', () => {
    for (const id of MODIFIER_IDS) {
      const matches = RECIPE_IDS.filter((r) => recipeMatchesFilter(RECIPES[r], MODIFIERS[id].appliesTo));
      expect(matches.length, id).toBeGreaterThan(0);
    }
  });
});

describe('dialogue', () => {
  it('every recipe, ingredient and modifier has at least one direct line', () => {
    const all = { ...RECIPE_LINES, ...INGREDIENT_LINES, ...MODIFIER_LINES };
    for (const [id, lines] of Object.entries(all)) {
      expect(lines.direct.length, id).toBeGreaterThan(0);
    }
  });

  it('no line is blank', () => {
    const all = [RECIPE_LINES, INGREDIENT_LINES, MODIFIER_LINES].flatMap((group) =>
      Object.values(group).flatMap((l) => [...l.direct, ...l.hint]),
    );
    for (const line of all) expect(line.trim()).not.toBe('');
  });
});
