import type Phaser from 'phaser';
import { expect, it } from 'vitest';
import { createNewGame, skipTutorial, startNextDay } from '../logic/gameState';
import { buySeed, plantCrop, tendCrop } from '../logic/garden';
import { loadGame } from '../logic/save';
import { memorySaveSlot } from '../storage/saveSlot';
import { beginCafeDay, continueGame, endCafeDay, getGameState, initGameState, setGameState, setGardenGameState } from './gameStore';

it('saves garden work against the pre-day checkpoint, then resumes and saves the live cafe normally', () => {
  const values = new Map<string, unknown>();
  const owner = { registry: { get: (key: string) => values.get(key), set: (key: string, value: unknown) => values.set(key, value) } } as unknown as Phaser.Game;
  const slot = memorySaveSlot();
  initGameState(owner, slot);
  const beforeDay = skipTutorial(plantCrop(buySeed({ ...createNewGame(), leaves: 20 }, 'mushroom'), 0, 'mushroom'));
  continueGame(owner, beforeDay);
  beginCafeDay(owner); // WorldMap captures day 1 before opening day 2.
  setGameState(owner, startNextDay(beforeDay));
  beginCafeDay(owner); // Floor must keep that checkpoint.
  const live = getGameState(owner);
  setGameState(owner, { ...live, leaves: live.leaves + 8, stock: { ...live.stock, mushroom: 22 } });
  setGardenGameState(owner, tendCrop(getGameState(owner), 0, 1000));
  setGardenGameState(owner, tendCrop(getGameState(owner), 0, 301000));
  const saved = loadGame(slot.read()!);
  expect(saved.ok).toBe(true);
  if (!saved.ok) return;
  expect(saved.state.day).toBe(1);
  expect(saved.state.leaves).toBe(beforeDay.leaves);
  expect(saved.state.stock.mushroom).toBe(34);
  expect(saved.state.garden.plots[0]).toBeNull();
  expect(getGameState(owner).day).toBe(2);
  expect(getGameState(owner).stock.mushroom).toBe(26);
  endCafeDay(owner);
  expect(loadGame(slot.read()!)).toEqual({ ok: true, state: getGameState(owner) });
});
