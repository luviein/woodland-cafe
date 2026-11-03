import { isFinishItem } from '../data/roomFinishProducts';
import { buyFinish, canBuyFinish } from '../logic/roomFinishShop';
import type Phaser from 'phaser';
import { isClothingItem } from '../data/catalogueProducts';
import { buyClothing, canBuyClothing } from '../logic/clothingShop';
import { buyFurniture, canBuyFurniture } from '../logic/shop';
import { getGameState, setGameState } from '../scenes/gameStore';
import type { CatalogueShop } from './CataloguePanel';

/** The stall and Decorate use the same rules and ownership counts. */
export function christmasCatalogueShop(scene: Phaser.Scene, onChange: () => void = () => {}): CatalogueShop {
  return {
    leaves: () => getGameState(scene).leaves,
    animal: () => getGameState(scene).animal,
    owned: id => {
      const state = getGameState(scene);
      if (isFinishItem(id)) return state.ownedFinishes.includes(id) ? 1 : 0;
      if (isClothingItem(id)) return state.ownedClothing.includes(id) ? 1 : 0;
      return state.furniture.stored[id] + state.furniture.placed.filter(piece => piece.design === id).length;
    },
    canBuy: id => isFinishItem(id) ? canBuyFinish(getGameState(scene), id) : isClothingItem(id) ? canBuyClothing(getGameState(scene), id) : canBuyFurniture(getGameState(scene), id),
    buy: id => {
      const state = getGameState(scene);
      setGameState(scene, isFinishItem(id) ? buyFinish(state, id) : isClothingItem(id) ? buyClothing(state, id) : buyFurniture(state, id));
      onChange();
    },
  };
}
