import { describe, expect, it } from 'vitest';
import { DAY_CONFIG } from '../data/dayConfig';
import { settleCleanBonus } from './cleanBonus';
import { createDay, recordLastDeparture, stepDay } from './day';
import { createFloorState, type Customer } from './floor';
import { createNewGame } from './gameState';
import { loadGame, saveGame } from './save';
import { netLeaves, recordServe, recordWages, summaryLines, totalEarned } from './dayStats';

const visitor = { id: 1 } as Customer;
const empty = () => createFloorState();
const occupied = () => ({ ...empty(), customers: [visitor] });
const closing = () => stepDay(createDay(), DAY_CONFIG.dayLengthSeconds);

describe('clean closing bonus', () => {
  it('awards ten once after a clean final departure, preserving inputs and saving the wallet normally', () => {
    const game = { ...createNewGame(), leaves: 30 };
    const day = recordLastDeparture(closing(), occupied(), empty());
    const snapshot = structuredClone({ game, day });
    const awarded = settleCleanBonus(game, day, empty());
    expect(awarded.game.leaves).toBe(40);
    expect(awarded.day.stats.cleanBonusLeaves).toBe(10);
    expect(settleCleanBonus(awarded.game, awarded.day, empty())).toEqual(awarded);
    expect({ game, day }).toEqual(snapshot);
    const saved = loadGame(saveGame(awarded.game));
    expect(saved.ok && saved.state.leaves).toBe(40);
  });

  it('does not reward a dirty departure even if cleaning finishes before a delayed summary', () => {
    const dirty = { ...empty(), messySeats: ['1,1'] };
    const day = recordLastDeparture(closing(), occupied(), dirty);
    const result = settleCleanBonus(createNewGame(), day, empty());
    expect(result.day.stats.cleanBonusLeaves).toBe(0);
    expect(result.game).toEqual(createNewGame());
    expect(result.day.cleanBonusSettled).toBe(true);
  });

  it('keeps a pre-closing departure result but replaces it when later customers leave', () => {
    const early = recordLastDeparture(createDay(), occupied(), empty());
    expect(settleCleanBonus(createNewGame(), early, empty()).day).toBe(early);
    expect(settleCleanBonus(createNewGame(), stepDay(early, DAY_CONFIG.dayLengthSeconds), empty()).day.stats.cleanBonusLeaves).toBe(10);
    const dirty = { ...empty(), messySeats: ['1,1'] };
    const later = recordLastDeparture(stepDay(early, DAY_CONFIG.dayLengthSeconds), occupied(), dirty);
    expect(settleCleanBonus(createNewGame(), later, dirty).day.stats.cleanBonusLeaves).toBe(0);
  });

  it('waits for the whole party to leave and never rewards a day without visitors', () => {
    const day = closing();
    expect(recordLastDeparture(day, { ...occupied(), customers: [visitor, { ...visitor, id: 2 }] }, occupied())).toBe(day);
    expect(settleCleanBonus(createNewGame(), { ...day, cleanAtLastDeparture: true }, occupied()).day.cleanBonusSettled).toBe(false);
    expect(settleCleanBonus(createNewGame(), day, empty()).day.stats.cleanBonusLeaves).toBe(0);
    const departed = recordLastDeparture(day, occupied(), empty());
    expect(settleCleanBonus(createNewGame(), departed, empty()).day.stats.cleanBonusLeaves).toBe(10);
  });

  it('includes the reward in earnings and net with a separate summary line alongside wages', () => {
    const day = recordLastDeparture(closing(), occupied(), empty());
    const awarded = settleCleanBonus(createNewGame(), day, empty());
    const stats = recordWages(recordServe(awarded.day.stats, 'perfect', { price: 5, tip: 2, total: 7 }), 3, ['mascot']);
    expect(totalEarned(stats)).toBe(17);
    expect(netLeaves(stats)).toBe(14);
    const lines = summaryLines(stats, 14);
    expect(lines).toContain('Clean bonus: 🍃 10');
    expect(lines).toContain('Earned: 🍃 17');
    expect(lines).toContain('  (5 dishes + 2 tips)');
    expect(lines).toContain('Net: 🍃 14');
    expect(lines).toContain('Wallet: 🍃 14');
  });

  it('does not create an unsafe wallet balance', () => {
    const game = { ...createNewGame(), leaves: Number.MAX_SAFE_INTEGER };
    const day = recordLastDeparture(closing(), occupied(), empty());
    expect(settleCleanBonus(game, day, empty())).toEqual({ game, day });
  });
});
