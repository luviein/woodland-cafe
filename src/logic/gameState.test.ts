import { describe, expect, it } from 'vitest';
import { STARTER_INGREDIENTS } from '../data/ingredients';
import { createNewGame, earnLeaves } from './gameState';
import { availableRecipes } from './orders';

describe('createNewGame', () => {
  it('starts on day 1 with no Leaves, the starter ingredients and no upgrades', () => {
    expect(createNewGame()).toEqual({ day: 1, leaves: 0, ingredients: STARTER_INGREDIENTS, upgrades: [] });
  });

  it('can be used directly to work out what can be ordered', () => {
    expect(availableRecipes(createNewGame())).toContain('jamBread');
  });

  it('survives a trip through JSON unchanged (ready for saving)', () => {
    const state = earnLeaves(createNewGame(), 12);
    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
  });
});

describe('earnLeaves', () => {
  it('adds to the wallet without changing the state it was given', () => {
    const before = createNewGame();
    const after = earnLeaves(earnLeaves(before, 5), 3);
    expect(after.leaves).toBe(8);
    expect(before.leaves).toBe(0);
  });

  it('earning nothing is fine', () => {
    expect(earnLeaves(createNewGame(), 0).leaves).toBe(0);
  });

  it('rejects negative and fractional amounts', () => {
    expect(() => earnLeaves(createNewGame(), -1)).toThrow(/whole number/);
    expect(() => earnLeaves(createNewGame(), 1.5)).toThrow(/whole number/);
  });
});
