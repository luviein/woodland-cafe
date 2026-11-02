import { describe, expect, it } from 'vitest';
import { createNewGame } from './gameState';
import { loadGame, saveGame } from './save';
import { changeAnimal, emptyOutfit, equip, readOutfit } from './wardrobe';
import { PLAYER_ANIMALS } from '../data/playerAnimals';
import { CLOTHING_IDS, CLOTHING_SLOTS, clothingIn } from '../data/clothing';

describe('wardrobe', () => {
  it('retains all four slots and validates that every item belongs to its slot', () => {
    for (const id of CLOTHING_IDS) {
      for (const slot of CLOTHING_SLOTS) {
        const outfit = readOutfit({ ...emptyOutfit(), [slot]: id });
        expect(outfit[slot]).toBe(clothingIn(slot).includes(id) ? id : null);
      }
    }
    const state = { ...createNewGame(), ownedClothing: CLOTHING_IDS, outfit: { hat: 'winterBeanie', top: 'treeJumper', cape: 'redCape', shoes: 'buckleBoots' } as const };
    expect(loadGame(saveGame(state))).toEqual({ ok: true, state });
  });

  it('migrates an older two-slot outfit without losing the equipped items', () => {
    const state = { ...createNewGame(), outfit: { hat: 'santaHat', top: 'santaCoat' } };
    expect(loadGame(JSON.stringify({ version: 4, state }))).toEqual({
      ok: true, state: { ...state, outfit: { ...emptyOutfit(), ...state.outfit } },
    });
  });
  it('equips and removes slots independently without mutating the original', () => {
    const original = emptyOutfit();
    const dressed = equip(equip(original, 'hat', 'santaHat'), 'top', 'santaCoat');
    expect(original).toEqual(emptyOutfit());
    expect(equip(dressed, 'hat', null)).toEqual({ ...emptyOutfit(), hat: null, top: 'santaCoat' });
    expect(equip(dressed, 'top', null)).toEqual({ ...emptyOutfit(), hat: 'santaHat', top: null });
  });

  it('round trips an equipped outfit through the save', () => {
    const state = { ...createNewGame(), outfit: { ...emptyOutfit(), hat: 'santaHat', top: 'santaCoat' } as const };
    expect(loadGame(saveGame(state))).toEqual({ ok: true, state });
  });

  it('loads version 2 saves without clothing and keeps their progress', () => {
    const { outfit: _outfit, ...old } = { ...createNewGame(), leaves: 123 };
    expect(loadGame(JSON.stringify({ version: 2, state: old })))
      .toEqual({ ok: true, state: { ...old, outfit: emptyOutfit() } });
  });

  it('drops unknown or malformed items without discarding valid slots', () => {
    expect(readOutfit({ hat: 'removedHat', top: 'santaCoat' })).toEqual({ ...emptyOutfit(), hat: null, top: 'santaCoat' });
    for (const raw of [null, [], 12, 'santaHat', { hat: {}, top: 3 }]) expect(readOutfit(raw)).toEqual(emptyOutfit());
  });
});

describe('player animal', () => {
  it('switches each species without changing outfit or progress, and saves it', () => {
    const original = { ...createNewGame(), leaves: 91, outfit: { ...emptyOutfit(), hat: 'santaHat', top: 'santaCoat' } as const };
    for (const animal of PLAYER_ANIMALS) {
      const changed = changeAnimal(original, animal);
      expect(changed).toEqual({ ...original, animal });
      expect(loadGame(saveGame(changed))).toEqual({ ok: true, state: changed });
    }
    expect(original.animal).toBe('hedgehog');
  });

  it('loads older saves and invalid species as hedgehog while retaining the outfit', () => {
    const state = { ...createNewGame(), outfit: { ...emptyOutfit(), hat: 'santaHat', top: null } };
    for (const animal of [undefined, 'squirrel', null, 17, {}]) {
      const saved = JSON.stringify({ version: 3, state: { ...state, animal } });
      expect(loadGame(saved)).toEqual({ ok: true, state: { ...state, animal: 'hedgehog' } });
    }
  });
});
