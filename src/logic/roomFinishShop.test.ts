import { describe, expect, it } from 'vitest';
import { FINISH_IDS, finishProduct } from '../data/roomFinishProducts';
import { CHRISTMAS_CATALOGUE } from '../data/furniture';
import { catalogueProduct } from '../data/catalogueProducts';
import { createNewGame } from './gameState';
import { buyFinish, canBuyFinish, ownsFinish } from './roomFinishShop';
import { paintFinish } from './roomDecorating';
import { loadGame, saveGame } from './save';

describe('room finish purchases', () => {
  it('lists every finish in the catalogue as a reusable one-time purchase', () => {
    expect(CHRISTMAS_CATALOGUE.tabs.find(tab => tab.name === 'Room')?.designs).toEqual(FINISH_IDS);
    for (const id of FINISH_IDS) expect(catalogueProduct(id)).toEqual(finishProduct(id));
  });

  it('charges once and refuses duplicate or unaffordable purchases', () => {
    const fresh = createNewGame();
    expect(canBuyFinish(fresh, 'floorFinish1')).toBe(false);
    expect(() => buyFinish(fresh, 'floorFinish1')).toThrow();
    const bought = buyFinish({ ...fresh, leaves: 25 }, 'floorFinish1');
    expect(bought.leaves).toBe(0);
    expect(bought.ownedFinishes).toEqual(['floorFinish1']);
    expect(ownsFinish(bought, 'floor', 1)).toBe(true);
    expect(ownsFinish(bought, 'wall', 1)).toBe(false);
    expect(ownsFinish(fresh, 'wall', 0)).toBe(true);
    expect(ownsFinish(fresh, 'floor', 0)).toBe(true);
    expect(canBuyFinish({ ...bought, leaves: 100 }, 'floorFinish1')).toBe(false);
    expect(() => buyFinish({ ...bought, leaves: 100 }, 'floorFinish1')).toThrow();
    expect(fresh.ownedFinishes).toEqual([]);
    expect(loadGame(saveGame(bought))).toEqual({ ok: true, state: bought });
  });

  it('retains finishes applied before purchases existed, and enforces ownership in newer saves', () => {
    const state = createNewGame();
    state.roomFinishes = paintFinish(state.room, state.roomFinishes, { x: 0, y: 1 }, 'wall', 2);
    state.roomFinishes = paintFinish(state.room, state.roomFinishes, { x: 3, y: 3 }, 'floor', 7);
    const file = JSON.parse(saveGame(state));
    file.version = 8;
    delete file.state.ownedFinishes;
    expect(loadGame(JSON.stringify(file))).toEqual({ ok: true, state: { ...state, ownedFinishes: ['wallFinish2', 'floorFinish7'] } });
    file.version = 9;
    const loaded = loadGame(JSON.stringify(file));
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) throw new Error(loaded.reason);
    expect(loaded.state.roomFinishes.every(row => /^0+$/.test(row))).toBe(true);
    expect(loaded.state.ownedFinishes).toEqual([]);
  });
});
