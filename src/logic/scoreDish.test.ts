import { describe, expect, it } from 'vitest';
import type { IngredientCounts } from '../data/ingredients';
import type { ModifierId } from '../data/modifiers';
import { countItems, scoreDish } from './scoreDish';
import type { Plate } from './types';

// Small helper so each test reads as "order X, served Y".
const plate = (ingredients: IngredientCounts, modifiers: ModifierId[] = []): Plate => ({
  ingredients,
  modifiers,
});

describe('countItems', () => {
  it('adds up all ingredient counts', () => {
    expect(countItems({ bread: 1, jam: 2 })).toBe(3);
  });

  it('is 0 for an empty plate', () => {
    expect(countItems({})).toBe(0);
  });
});

describe('scoreDish: ingredients', () => {
  const jamSandwich = plate({ bread: 2, jam: 1 });

  it('perfect when counts match exactly', () => {
    expect(scoreDish(jamSandwich, plate({ bread: 2, jam: 1 })).score).toBe('perfect');
  });

  it('perfect regardless of the order ingredients were added', () => {
    expect(scoreDish(jamSandwich, plate({ jam: 1, bread: 2 })).score).toBe('perfect');
  });

  it('treats a zero count the same as a missing key', () => {
    expect(scoreDish(jamSandwich, plate({ bread: 2, jam: 1, mushroom: 0 })).score).toBe('perfect');
  });

  it('close when one item is missing', () => {
    expect(scoreDish(jamSandwich, plate({ bread: 1, jam: 1 })).score).toBe('close');
  });

  it('close when one item is extra', () => {
    expect(scoreDish(jamSandwich, plate({ bread: 2, jam: 2 })).score).toBe('close');
  });

  it('close when one item is swapped for another', () => {
    expect(scoreDish(jamSandwich, plate({ bread: 2, mushroom: 1 })).score).toBe('close');
  });

  it('wrong when two items are missing', () => {
    expect(scoreDish(jamSandwich, plate({ bread: 1 })).score).toBe('wrong');
  });

  it('wrong when two items are extra', () => {
    expect(scoreDish(jamSandwich, plate({ bread: 3, jam: 2 })).score).toBe('wrong');
  });

  it('wrong when a swap comes with an extra item', () => {
    // missing 1 jam, extra 2 mushrooms
    expect(scoreDish(jamSandwich, plate({ bread: 2, mushroom: 2 })).score).toBe('wrong');
  });

  it('wrong for an empty plate, even when the order is a single item', () => {
    // Plain Bread is 1 item; an empty plate is "only one missing", but must not be close.
    expect(scoreDish(plate({ bread: 1 }), plate({})).score).toBe('wrong');
  });

  it('respects a custom close tolerance', () => {
    expect(scoreDish(jamSandwich, plate({ bread: 2, mushroom: 1 }), 0).score).toBe('wrong');
    expect(scoreDish(jamSandwich, plate({ bread: 1 }), 2).score).toBe('close');
  });
});

describe('scoreDish: modifiers', () => {
  it('lists requested modifiers the dish is missing', () => {
    const result = scoreDish(plate({ bread: 1 }, ['toasted']), plate({ bread: 1 }));
    expect(result.missingModifiers).toEqual(['toasted']);
  });

  it('keeps the ingredient score separate from missing modifiers', () => {
    // Right ingredients, forgot to toast: still "perfect"; the tip penalty
    // for the missing modifier is applied later by the tip logic.
    const result = scoreDish(plate({ bread: 1 }, ['toasted']), plate({ bread: 1 }));
    expect(result.score).toBe('perfect');
  });

  it('has no missing modifiers when all are applied', () => {
    const result = scoreDish(
      plate({ bread: 1 }, ['toasted', 'buttered']),
      plate({ bread: 1 }, ['buttered', 'toasted']),
    );
    expect(result.missingModifiers).toEqual([]);
  });

  it('ignores extra modifiers the customer did not ask for', () => {
    const result = scoreDish(plate({ bread: 1 }), plate({ bread: 1 }, ['toasted']));
    expect(result).toEqual({ score: 'perfect', missingModifiers: [] });
  });
});
