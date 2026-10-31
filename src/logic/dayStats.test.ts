import { describe, expect, it } from 'vitest';
import {
  createDayStats,
  ingredientLines,
  netLeaves,
  recordGaveUp,
  recordIngredients,
  recordOutOfStock,
  recordServe,
  recordWages,
  summaryLines,
  totalEarned,
  totalServed,
} from './dayStats';

const paid = (price: number, tip: number) => ({ price, tip, total: price + tip });
const NOTHING = paid(0, 0);

describe('day stats', () => {
  it('start at zero', () => {
    const stats = createDayStats();
    expect(totalServed(stats)).toBe(0);
    expect(totalEarned(stats)).toBe(0);
    expect(stats.gaveUp).toBe(0);
    expect(stats.outOfStock).toBe(0);
    expect(stats.used).toEqual({});
  });

  it('count serves by score and add up prices and tips separately', () => {
    let stats = createDayStats();
    stats = recordServe(stats, 'perfect', paid(3, 3));
    stats = recordServe(stats, 'perfect', paid(4, 2));
    stats = recordServe(stats, 'close', paid(3, 1));
    stats = recordServe(stats, 'wrong', NOTHING);
    expect(stats.served).toEqual({ perfect: 2, close: 1, wrong: 1 });
    expect(totalServed(stats)).toBe(4);
    expect(stats.priceLeaves).toBe(10);
    expect(stats.tipLeaves).toBe(6);
    expect(totalEarned(stats)).toBe(16);
  });

  it('count customers who gave up', () => {
    const stats = recordGaveUp(recordGaveUp(createDayStats()), 2);
    expect(stats.gaveUp).toBe(3);
  });

  it('count customers who left because their dish ran out', () => {
    expect(recordOutOfStock(recordOutOfStock(createDayStats())).outOfStock).toBe(2);
  });

  it('add up ingredients used and the rush spending; net is earned minus spent', () => {
    let stats = recordIngredients(createDayStats(), {
      uses: [
        { id: 'bread', fromStock: 2, rushed: 0 },
        { id: 'jam', fromStock: 0, rushed: 1 },
      ],
      rushCost: 2,
    });
    stats = recordIngredients(stats, { uses: [{ id: 'bread', fromStock: 0, rushed: 1 }], rushCost: 2 });
    expect(stats.used).toEqual({ bread: { fromStock: 2, rushed: 1 }, jam: { fromStock: 0, rushed: 1 } });
    expect(stats.rushLeaves).toBe(4);
    expect(netLeaves(recordServe(stats, 'perfect', paid(3, 0)))).toBe(-1);
  });

  it('never change the stats they were given', () => {
    const before = createDayStats();
    recordServe(before, 'perfect', paid(3, 3));
    recordGaveUp(before);
    recordOutOfStock(before);
    recordIngredients(before, { uses: [{ id: 'bread', fromStock: 1, rushed: 0 }], rushCost: 0 });
    expect(before).toEqual(createDayStats());
  });
});

describe('summaryLines', () => {
  it('describes the day', () => {
    let stats = recordServe(createDayStats(), 'perfect', paid(3, 3));
    stats = recordServe(stats, 'wrong', NOTHING);
    stats = recordGaveUp(stats);
    stats = recordOutOfStock(stats);
    stats = recordIngredients(stats, { uses: [{ id: 'jam', fromStock: 0, rushed: 1 }], rushCost: 2 });
    expect(summaryLines(stats, 40)).toEqual([
      'Served: 2 (1 perfect, 0 close, 1 wrong)',
      'Gave up waiting: 1',
      'Left, out of stock: 1',
      'Earned: 🍃 6 (3 dishes + 3 tips)',
      'Rush deliveries: 🍃 2',
      'Net: 🍃 4',
      'Wallet: 🍃 40',
    ]);
  });
});

describe('wages in the summary', () => {
  it('come off the net, with a line only once someone was employed', () => {
    const stats = recordServe(createDayStats(), 'perfect', paid(30, 10));
    expect(summaryLines(stats, 0).some((l) => l.startsWith('Wages'))).toBe(false);
    const paidOut = recordWages(stats, 15, ['mascot']);
    expect(netLeaves(paidOut)).toBe(25);
    expect(summaryLines(paidOut, 25)).toEqual([
      'Served: 1 (1 perfect, 0 close, 0 wrong)',
      'Gave up waiting: 0',
      'Left, out of stock: 0',
      'Earned: 🍃 40 (30 dishes + 10 tips)',
      'Rush deliveries: 🍃 0',
      'Wages: 🍃 15',
      "Couldn't pay, quit: Mascot",
      'Net: 🍃 25',
      'Wallet: 🍃 25',
    ]);
  });
});

describe('ingredientLines', () => {
  it('one line per ingredient used, in ingredient-list order, with rushes noted', () => {
    const stats = recordIngredients(createDayStats(), {
      uses: [
        { id: 'jam', fromStock: 3, rushed: 0 },
        { id: 'bread', fromStock: 10, rushed: 4 },
      ],
      rushCost: 8,
    });
    expect(ingredientLines(stats)).toEqual(['Bread x14 (4 rush)', 'Jam x3']);
  });

  it('says None on a day nothing was cooked', () => {
    expect(ingredientLines(createDayStats())).toEqual(['None']);
  });
});
