import { describe, expect, it } from 'vitest';
import { acceptedOrderings } from '../logic/acceptedOrderings';
import { recipeMatchesFilter } from '../logic/orders';
import { SCORING_CONFIG } from './scoring';
import { INGREDIENT_LINES, MODIFIER_LINES, REACTION_LINES, RECIPE_LINES } from './dialogue';
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
  it('every recipe has at least one layer', () => {
    for (const id of RECIPE_IDS) {
      expect(RECIPES[id].layers.length, id).toBeGreaterThan(0);
    }
  });

  it('every recipe starts with bread on the bottom', () => {
    for (const id of RECIPE_IDS) {
      expect(RECIPES[id].layers[0], id).toBe('bread');
    }
  });

  it('"sandwich" tag matches recipes with bread on the bottom and top', () => {
    for (const id of RECIPE_IDS) {
      const { layers, tags } = RECIPES[id];
      const isSandwich = (tags as readonly string[]).includes('sandwich');
      const breadBothEnds = layers.length >= 3 && layers.at(-1) === 'bread';
      expect(isSandwich, id).toBe(breadBothEnds);
    }
  });

  it('no dish is perfect for two different recipes', () => {
    // Fillings can be in any order, so compare every accepted ordering, not
    // just the listed one: bread > chilli > tuna would clash with Spicy Tuna Bread.
    const owner = new Map<string, string>();
    for (const id of RECIPE_IDS) {
      for (const layers of acceptedOrderings(RECIPES[id].layers, SCORING_CONFIG.fixedIngredients)) {
        const key = layers.join('>');
        expect(owner.get(key), `${id} clashes with ${owner.get(key)}`).toBeUndefined();
        owner.set(key, id);
      }
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
    all.push(...Object.values(REACTION_LINES).flat());
    for (const line of all) expect(line.trim()).not.toBe('');
  });

  it('every score has reaction lines', () => {
    for (const [score, lines] of Object.entries(REACTION_LINES)) {
      expect(lines.length, score).toBeGreaterThan(0);
    }
  });
});
