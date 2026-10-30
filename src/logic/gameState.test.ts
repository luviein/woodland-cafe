import { describe, expect, it } from 'vitest';
import { STARTER_INGREDIENTS } from '../data/ingredients';
import { LEAF_CONFIG } from '../data/leafConfig';
import { createNewGame, earnLeaves, leavesLeftToday, pickUpLeaves, startNextDay } from './gameState';
import { availableRecipes } from './orders';

describe('createNewGame', () => {
  it('starts on day 1 with no Leaves, the starter ingredients and their stock, and no upgrades', () => {
    expect(createNewGame()).toEqual({
      day: 1,
      leaves: 0,
      ingredients: STARTER_INGREDIENTS,
      upgrades: [],
      stock: { bread: 30, mushroom: 30, jam: 30, chilli: 0, tuna: 0, tomato: 0 },
      leavesPickedToday: 0,
    });
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

describe('startNextDay', () => {
  it('moves to the next day and keeps the wallet and everything owned', () => {
    const before = earnLeaves(createNewGame(), 20);
    const after = startNextDay(before);
    expect(after).toEqual({ ...before, day: 2 });
    expect(before.day).toBe(1);
  });

  it("resets today's leaf pickups", () => {
    expect(startNextDay(pickUpLeaves(createNewGame(), 4)).leavesPickedToday).toBe(0);
  });
});

describe('leaf pickups and the daily cap', () => {
  const CAP = { ...LEAF_CONFIG, leavesPerDay: 10 };

  it('picked-up Leaves go into the wallet and count towards the cap', () => {
    const state = pickUpLeaves(pickUpLeaves(createNewGame(), 3), 2);
    expect(state.leaves).toBe(5);
    expect(state.leavesPickedToday).toBe(5);
    expect(leavesLeftToday(state, CAP)).toBe(5);
  });

  it('never says less than 0 left (e.g. the cap was lowered mid-day)', () => {
    expect(leavesLeftToday(pickUpLeaves(createNewGame(), 12), CAP)).toBe(0);
  });
});
