import { describe, expect, it } from 'vitest';
import { CLOTHING_IDS, STARTER_CLOTHING, clothingPrice } from '../data/clothing';
import { buyClothing, canBuyClothing, toggleClothing } from './clothingShop';
import { createNewGame } from './gameState';
import { loadGame, saveGame } from './save';
import { emptyOutfit } from './wardrobe';

describe('Christmas clothing purchases', () => {
  it('starts with the Santa hat and coat, leaving the rest for the catalogue', () => {
    expect(createNewGame().ownedClothing).toEqual(STARTER_CLOTHING);
    expect(toggleClothing(createNewGame(), 'treeJumper')).toEqual(createNewGame());
  });

  it('charges the exact price once and unlocks the item for every animal', () => {
    for (const id of CLOTHING_IDS.filter(item => !STARTER_CLOTHING.includes(item))) {
      const original = { ...createNewGame(), leaves: clothingPrice(id) };
      const bought = buyClothing(original, id);
      expect(original.ownedClothing).not.toContain(id);
      expect(bought.leaves).toBe(0);
      expect(bought.ownedClothing).toContain(id);
      expect(canBuyClothing(bought, id)).toBe(false);
      expect(() => buyClothing({ ...bought, leaves: 999 }, id)).toThrow();
      for (const animal of ['hedgehog', 'rabbit', 'mouse', 'deer'] as const) {
        expect(Object.values(toggleClothing({ ...bought, animal }, id).outfit)).toContain(id);
      }
      expect(loadGame(saveGame(bought))).toEqual({ ok: true, state: bought });
    }
  });

  it('rejects unaffordable purchases without changing the wallet', () => {
    const state = { ...createNewGame(), leaves: clothingPrice('redCape') - 1 };
    expect(canBuyClothing(state, 'redCape')).toBe(false);
    expect(() => buyClothing(state, 'redCape')).toThrow();
    expect(state.leaves).toBe(clothingPrice('redCape') - 1);
  });

  it('keeps the full previously free collection when migrating an old save', () => {
    const { ownedClothing: _owned, ...old } = createNewGame();
    const result = loadGame(JSON.stringify({ version: 5, state: { ...old, outfit: { ...emptyOutfit(), hat: 'winterBeanie' } } }));
    expect(result).toEqual({ ok: true, state: { ...old, ownedClothing: CLOTHING_IDS, outfit: { ...emptyOutfit(), hat: 'winterBeanie' } } });
  });

  it('drops unknown ownership ids and unequips unowned clothing in a current save', () => {
    const state = { ...createNewGame(), ownedClothing: ['santaHat', 'missing'], outfit: { ...emptyOutfit(), top: 'treeJumper' } };
    const loaded = loadGame(JSON.stringify({ version: 6, state }));
    expect(loaded).toEqual({ ok: true, state: { ...state, ownedClothing: ['santaHat'], outfit: emptyOutfit() } });
  });
});
