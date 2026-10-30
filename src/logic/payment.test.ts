import { describe, expect, it } from 'vitest';
import { RECIPE_PRICES } from '../data/prices';
import type { TipConfig } from '../data/tipConfig';
import { computePayment } from './payment';
import type { Order, ScoreResult } from './types';

// Round numbers so the expected values are easy to check by hand.
const CONFIG: TipConfig = {
  fullTipShare: 1,
  tiers: [
    { above: 0.75, share: 1 },
    { above: 0.5, share: 0.6 },
    { above: 0.25, share: 0.3 },
  ],
  closeMultiplier: 0.5,
  missingModifierMultiplier: 0.2,
};
// Price 5, so the full tip is 5.
const ORDER: Order = { recipeId: 'tunaTomatoSandwich', modifiers: [], quantity: 1 };
const PRICES = { ...RECIPE_PRICES, tunaTomatoSandwich: 5 };
const PRICE = 5;

const perfect: ScoreResult = { score: 'perfect', missingModifiers: [] };
const close: ScoreResult = { score: 'close', missingModifiers: [] };
const pay = (result: ScoreResult, patience: number, order = ORDER) =>
  computePayment(order, result, patience, CONFIG, PRICES);

describe('computePayment', () => {
  it('uses the recipe price', () => {
    expect(pay(perfect, 0).price).toBe(5);
    expect(computePayment(ORDER, perfect, 0, CONFIG).price).toBe(RECIPE_PRICES.tunaTomatoSandwich);
  });

  it.each([
    [1, 5], // full
    [0.8, 5],
    [0.7, 3], // reduced: 5 * 0.6
    [0.4, 2], // small: 5 * 0.3 = 1.5, rounded up
    [0.2, 0], // none
    [0, 0],
  ])('patience %f -> tip %i', (patience, tip) => {
    expect(pay(perfect, patience)).toEqual({ price: PRICE, tip, total: PRICE + tip });
  });

  it('a boundary counts as the lower tier', () => {
    expect(pay(perfect, 0.75).tip).toBe(3);
    expect(pay(perfect, 0.5).tip).toBe(2);
    expect(pay(perfect, 0.25).tip).toBe(0);
  });

  it('a close dish halves the tip but pays the full price', () => {
    expect(pay(close, 1)).toEqual({ price: 5, tip: 3, total: 8 }); // 2.5 rounds to 3
  });

  it('a missing modifier cuts the tip to 20%, once however many are missing', () => {
    const oneMissing: ScoreResult = { score: 'perfect', missingModifiers: ['toasted'] };
    const twoMissing: ScoreResult = { score: 'perfect', missingModifiers: ['toasted', 'cutInHalf'] };
    expect(pay(oneMissing, 1).tip).toBe(1);
    expect(pay(twoMissing, 1).tip).toBe(1);
  });

  it('close and missing-modifier cuts stack', () => {
    // 5 * 0.5 * 0.2 = 0.5 -> 1;  5 * 0.6 * 0.5 * 0.2 = 0.3 -> 0
    const both: ScoreResult = { score: 'close', missingModifiers: ['toasted'] };
    expect(pay(both, 1).tip).toBe(1);
    expect(pay(both, 0.7).tip).toBe(0);
  });

  it('a wrong dish pays nothing, however patient they were', () => {
    expect(pay({ score: 'wrong', missingModifiers: [] }, 1)).toEqual({ price: 0, tip: 0, total: 0 });
  });

  it('a double order pays (and tips) for two', () => {
    expect(pay(perfect, 1, { ...ORDER, quantity: 2 })).toEqual({ price: 10, tip: 10, total: 20 });
  });
});
