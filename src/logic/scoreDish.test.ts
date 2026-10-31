import { describe, expect, it } from 'vitest';
import type { IngredientId } from '../data/ingredients';
import type { ModifierId } from '../data/modifiers';
import { SCORING_CONFIG } from '../data/scoring';
import { scoreDish } from './scoreDish';
import type { Plate } from './types';

// Small helper so each test reads as "order X, served Y".
const plate = (layers: IngredientId[], modifiers: ModifierId[] = []): Plate => ({
  layers,
  modifiers,
});

describe('scoreDish: layers', () => {
  const jamSandwich = plate(['bread', 'jam', 'bread']);
  const score = (layers: IngredientId[]) => scoreDish(jamSandwich, plate(layers)).score;

  it('perfect when every layer matches, in order', () => {
    expect(score(['bread', 'jam', 'bread'])).toBe('perfect');
  });

  it('close when one layer is missing', () => {
    expect(score(['bread', 'jam'])).toBe('close');
  });

  it('close when one layer is extra', () => {
    expect(score(['bread', 'jam', 'jam', 'bread'])).toBe('close');
  });

  it('close when one layer is replaced', () => {
    expect(score(['bread', 'mushroom', 'bread'])).toBe('close');
  });

  it('close when two neighbouring layers are swapped', () => {
    expect(score(['bread', 'bread', 'jam'])).toBe('close');
  });

  it('wrong with two mistakes', () => {
    expect(score(['jam', 'jam'])).toBe('wrong');
    expect(score(['bread', 'bread', 'jam', 'jam'])).toBe('wrong');
  });

  it('bread out of place counts as a mistake', () => {
    // Same four ingredients as the recipe, but bread isn't at the ends.
    const tunaTomato = plate(['bread', 'tuna', 'tomato', 'bread']);
    expect(scoreDish(tunaTomato, plate(['tomato', 'bread', 'bread', 'tuna'])).score).toBe('wrong');
  });

  it('wrong for an empty plate, even when the order is a single layer', () => {
    // Plain Bread is 1 layer; an empty plate is "only one missing", but must not be close.
    expect(scoreDish(plate(['bread']), plate([])).score).toBe('wrong');
  });

  it('respects a custom close tolerance', () => {
    const strict = { ...SCORING_CONFIG, closeTolerance: 0 };
    const lenient = { ...SCORING_CONFIG, closeTolerance: 2 };
    expect(scoreDish(jamSandwich, plate(['bread', 'bread', 'jam']), strict).score).toBe('wrong');
    expect(scoreDish(jamSandwich, plate(['jam', 'jam']), lenient).score).toBe('close');
  });
});

describe('scoreDish: filling order', () => {
  const tunaTomato = plate(['bread', 'tuna', 'tomato', 'bread']);
  const spicyTuna = plate(['bread', 'tuna', 'chilli']);

  it('sandwich fillings between the breads can be in any order', () => {
    expect(scoreDish(tunaTomato, plate(['bread', 'tuna', 'tomato', 'bread'])).score).toBe('perfect');
    expect(scoreDish(tunaTomato, plate(['bread', 'tomato', 'tuna', 'bread'])).score).toBe('perfect');
  });

  it('open bread toppings can be in any order', () => {
    expect(scoreDish(spicyTuna, plate(['bread', 'chilli', 'tuna'])).score).toBe('perfect');
  });

  it('judges mistakes against the closest accepted ordering', () => {
    // Fillings swapped AND top bread missing: only the missing bread counts.
    expect(scoreDish(tunaTomato, plate(['bread', 'tomato', 'tuna'])).score).toBe('close');
  });

  it('bread must stay fixed when fillings are free', () => {
    // Bread moved from the bottom to the middle: not just a filling swap.
    expect(scoreDish(spicyTuna, plate(['tuna', 'bread', 'chilli'])).score).toBe('close');
    expect(scoreDish(spicyTuna, plate(['tuna', 'chilli', 'bread'])).score).toBe('wrong');
  });

  it('with no fixed ingredients, every layer can go anywhere', () => {
    const anyOrder = { ...SCORING_CONFIG, fixedIngredients: [] };
    expect(scoreDish(spicyTuna, plate(['chilli', 'tuna', 'bread']), anyOrder).score).toBe('perfect');
  });
});

describe('scoreDish: modifiers', () => {
  it('lists requested modifiers the dish is missing', () => {
    const result = scoreDish(plate(['bread'], ['toasted']), plate(['bread']));
    expect(result.missingModifiers).toEqual(['toasted']);
  });

  it('a missing modifier is one mistake: right layers, forgot to toast = close', () => {
    const result = scoreDish(plate(['bread'], ['toasted']), plate(['bread']));
    expect(result.score).toBe('close');
  });

  it('an extra modifier is one mistake too: toasted without being asked = close', () => {
    const result = scoreDish(plate(['bread', 'jam']), plate(['bread', 'jam'], ['toasted']));
    expect(result).toEqual({ score: 'close', missingModifiers: [], extraModifiers: ['toasted'] });
  });

  it('a modifier mistake plus a layer mistake is two mistakes: wrong', () => {
    expect(scoreDish(plate(['bread', 'jam']), plate(['bread'], ['toasted'])).score).toBe('wrong');
    expect(scoreDish(plate(['bread', 'jam'], ['toasted']), plate(['bread'])).score).toBe('wrong');
  });

  it('has no missing modifiers when all are applied', () => {
    const result = scoreDish(
      plate(['bread'], ['toasted', 'buttered']),
      plate(['bread'], ['buttered', 'toasted']),
    );
    expect(result).toEqual({ score: 'perfect', missingModifiers: [], extraModifiers: [] });
  });
});
