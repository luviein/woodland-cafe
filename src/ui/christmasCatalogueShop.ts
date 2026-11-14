import { isFinishItem } from '../data/roomFinishProducts';
import type Phaser from 'phaser';
import { isClothingItem } from '../data/catalogueProducts';
import { canBuyChristmasItem } from '../logic/christmasShop';
import { getGameState, purchaseChristmasItem } from '../scenes/gameStore';
import type { CatalogueShop } from './CataloguePanel';

/** The stall and Decorate use the same rules and ownership counts. */
export function christmasCatalogueShop(scene: Phaser.Scene, onChange: () => void = () => {}): CatalogueShop {
  return {
    tickets: () => getGameState(scene).christmasTickets,
    animal: () => getGameState(scene).animal,
    owned: id => {
      const state = getGameState(scene);
      if (isFinishItem(id)) return state.ownedFinishes.includes(id) ? 1 : 0;
      if (isClothingItem(id)) return state.ownedClothing.includes(id) ? 1 : 0;
      return state.furniture.stored[id] + state.furniture.placed.filter(piece => piece.design === id).length;
    },
    canBuy: id => canBuyChristmasItem(getGameState(scene), id),
    buy: id => {
      purchaseChristmasItem(scene, id);
      onChange();
    },
  };
}
