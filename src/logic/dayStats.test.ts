import { describe, expect, it } from 'vitest';
import { createDayStats, recordGaveUp, recordServe, totalEarned, totalServed } from './dayStats';

const paid = (price: number, tip: number) => ({ price, tip, total: price + tip });
const NOTHING = paid(0, 0);

describe('day stats', () => {
  it('start at zero', () => {
    const stats = createDayStats();
    expect(totalServed(stats)).toBe(0);
    expect(totalEarned(stats)).toBe(0);
    expect(stats.gaveUp).toBe(0);
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

  it('never change the stats they were given', () => {
    const before = createDayStats();
    recordServe(before, 'perfect', paid(3, 3));
    recordGaveUp(before);
    expect(before).toEqual(createDayStats());
  });
});
