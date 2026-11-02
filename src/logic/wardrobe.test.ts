import { describe, expect, it } from 'vitest';
import { createNewGame } from './gameState';
import { loadGame, saveGame } from './save';
import { emptyOutfit, equip, readOutfit } from './wardrobe';

describe('wardrobe', () => {
  it('equips and removes slots independently without mutating the original', () => {
    const original = emptyOutfit();
    const dressed = equip(equip(original, 'hat', 'santaHat'), 'top', 'santaCoat');
    expect(original).toEqual(emptyOutfit());
    expect(equip(dressed, 'hat', null)).toEqual({ hat: null, top: 'santaCoat' });
    expect(equip(dressed, 'top', null)).toEqual({ hat: 'santaHat', top: null });
  });

  it('round trips an equipped outfit through the save', () => {
    const state = { ...createNewGame(), outfit: { hat: 'santaHat', top: 'santaCoat' } as const };
    expect(loadGame(saveGame(state))).toEqual({ ok: true, state });
  });

  it('loads version 2 saves without clothing and keeps their progress', () => {
    const { outfit: _outfit, ...old } = { ...createNewGame(), leaves: 123 };
    expect(loadGame(JSON.stringify({ version: 2, state: old })))
      .toEqual({ ok: true, state: { ...old, outfit: emptyOutfit() } });
  });

  it('drops unknown or malformed items without discarding valid slots', () => {
    expect(readOutfit({ hat: 'removedHat', top: 'santaCoat' })).toEqual({ hat: null, top: 'santaCoat' });
    for (const raw of [null, [], 12, 'santaHat', { hat: {}, top: 3 }]) expect(readOutfit(raw)).toEqual(emptyOutfit());
  });
});
