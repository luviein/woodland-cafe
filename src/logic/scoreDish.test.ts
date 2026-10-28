import { describe, expect, it } from 'vitest';
import type { IngredientId } from '../data/ingredients';
import type { ModifierId } from '../data/modifiers';
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

  it('order matters: the right ingredients scrambled is wrong', () => {
    // Same four ingredients as the recipe, but needing several fixes.
    const tunaTomato = plate(['bread', 'tuna', 'tomato', 'bread']);
    expect(scoreDish(tunaTomato, plate(['tomato', 'bread', 'bread', 'tuna'])).score).toBe('wrong');
  });

  it('wrong for an empty plate, even when the order is a single layer', () => {
    // Plain Bread is 1 layer; an empty plate is "only one missing", but must not be close.
    expect(scoreDish(plate(['bread']), plate([])).score).toBe('wrong');
  });

  it('respects a custom close tolerance', () => {
    expect(scoreDish(jamSandwich, plate(['bread', 'bread', 'jam']), 0).score).toBe('wrong');
    expect(scoreDish(jamSandwich, plate(['jam', 'jam']), 2).score).toBe('close');
  });
});

describe('scoreDish: modifiers', () => {
  it('lists requested modifiers the dish is missing', () => {
    const result = scoreDish(plate(['bread'], ['toasted']), plate(['bread']));
    expect(result.missingModifiers).toEqual(['toasted']);
  });

  it('keeps the layer score separate from missing modifiers', () => {
    // Right layers, forgot to toast: still "perfect"; the tip penalty
    // for the missing modifier is applied later by the tip logic.
    const result = scoreDish(plate(['bread'], ['toasted']), plate(['bread']));
    expect(result.score).toBe('perfect');
  });

  it('has no missing modifiers when all are applied', () => {
    const result = scoreDish(
      plate(['bread'], ['toasted', 'buttered']),
      plate(['bread'], ['buttered', 'toasted']),
    );
    expect(result.missingModifiers).toEqual([]);
  });

  it('ignores extra modifiers the customer did not ask for', () => {
    const result = scoreDish(plate(['bread']), plate(['bread'], ['toasted']));
    expect(result).toEqual({ score: 'perfect', missingModifiers: [] });
  });
});
