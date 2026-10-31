import { describe, expect, it } from 'vitest';
import { hire, isHired, letGo, payWages } from './employees';
import { createNewGame, earnLeaves } from './gameState';

describe('hiring', () => {
  it('starts with nobody, and hiring is free', () => {
    const state = earnLeaves(createNewGame(), 5);
    expect(state.employees).toEqual([]);
    const hired = hire(state, 'cleaner');
    expect(isHired(hired, 'cleaner')).toBe(true);
    expect(isHired(hired, 'mascot')).toBe(false);
    expect(hired.leaves).toBe(5);
  });

  it('keeps roles in Notice Board order, once each', () => {
    const state = hire(hire(hire(createNewGame(), 'cleaner'), 'mascot'), 'cleaner');
    expect(state.employees).toEqual(['mascot', 'cleaner']);
  });

  it('letting go is free, and does nothing for someone not hired', () => {
    const state = hire(earnLeaves(createNewGame(), 5), 'mascot');
    expect(letGo(state, 'mascot').employees).toEqual([]);
    expect(letGo(state, 'cleaner').employees).toEqual(['mascot']);
    expect(letGo(state, 'mascot').leaves).toBe(5);
  });
});

describe('payWages', () => {
  it('pays nothing with nobody hired', () => {
    const state = earnLeaves(createNewGame(), 10);
    expect(payWages(state)).toEqual({ state, paid: 0, quit: [] });
  });

  it('pays everyone hired from the wallet', () => {
    const state = hire(hire(earnLeaves(createNewGame(), 50), 'mascot'), 'cleaner');
    const result = payWages(state);
    expect(result.paid).toBe(35);
    expect(result.quit).toEqual([]);
    expect(result.state.leaves).toBe(15);
    expect(result.state.employees).toEqual(['mascot', 'cleaner']);
  });

  it("anyone who can't be paid in full quits unpaid; a cheaper one after may still be paid", () => {
    // 18 Leaves: not enough for the Mascot (20), enough for the Cleaner (15).
    const state = hire(hire(earnLeaves(createNewGame(), 18), 'mascot'), 'cleaner');
    const result = payWages(state);
    expect(result.quit).toEqual(['mascot']);
    expect(result.paid).toBe(15);
    expect(result.state.leaves).toBe(3);
    expect(result.state.employees).toEqual(['cleaner']);
  });

  it('never takes the wallet below 0', () => {
    const result = payWages(hire(hire(createNewGame(), 'mascot'), 'cleaner'));
    expect(result.state.leaves).toBe(0);
    expect(result.quit).toEqual(['mascot', 'cleaner']);
    expect(result.state.employees).toEqual([]);
  });
});
