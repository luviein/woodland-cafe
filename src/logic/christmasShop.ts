import { catalogueProduct, isClothingItem, type CatalogueItem } from '../data/catalogueProducts';
import { CHRISTMAS_CATALOGUE } from '../data/furniture';
import { FINISH_IDS, isFinishItem } from '../data/roomFinishProducts';
import { CLOTHING_IDS } from '../data/clothing';
import { storePieces } from './furniture';
import type { GameState } from './gameState';

const products = new Set<CatalogueItem>(CHRISTMAS_CATALOGUE.tabs.flatMap(tab => [...tab.designs]));

export function canBuyChristmasItem(state: GameState, id: CatalogueItem): boolean {
  if (!products.has(id) || state.christmasTickets < catalogueProduct(id).price) return false;
  if (isFinishItem(id)) return !state.ownedFinishes.includes(id);
  if (isClothingItem(id)) return !state.ownedClothing.includes(id);
  return true;
}

/** The catalogue keeps its prices and ownership rules, but spends only tickets. */
export function buyChristmasItem(state: GameState, id: CatalogueItem): GameState {
  if (!canBuyChristmasItem(state, id)) throw new Error(`Cannot buy Christmas item '${id}'`);
  const paid = { ...state, christmasTickets: state.christmasTickets - catalogueProduct(id).price };
  if (isFinishItem(id)) return { ...paid, ownedFinishes: FINISH_IDS.filter(item => item === id || paid.ownedFinishes.includes(item)) };
  if (isClothingItem(id)) return { ...paid, ownedClothing: CLOTHING_IDS.filter(item => item === id || paid.ownedClothing.includes(item)) };
  return { ...paid, furniture: storePieces(paid.furniture, id, 1) };
}
