import { describe, expect, it } from 'vitest';
import { uniqueIngredients } from './dish';

describe('uniqueIngredients', () => {
  it('lists each ingredient once, in first-seen order', () => {
    expect(uniqueIngredients(['bread', 'jam', 'bread'])).toEqual(['bread', 'jam']);
  });

  it('is empty for no layers', () => {
    expect(uniqueIngredients([])).toEqual([]);
  });
});
