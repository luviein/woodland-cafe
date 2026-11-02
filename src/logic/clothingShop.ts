import { CLOTHING, CLOTHING_IDS, clothingPrice, type ClothingId } from '../data/clothing';
import { spendLeaves, type GameState } from './gameState';
import { equip } from './wardrobe';

export function canBuyClothing(state: GameState, id: ClothingId): boolean {
  return !state.ownedClothing.includes(id) && state.leaves >= clothingPrice(id);
}

/** One purchase unlocks an item for every animal, rather than buying four copies. */
export function buyClothing(state: GameState, id: ClothingId): GameState {
  if (!canBuyClothing(state, id)) throw new Error(`Cannot buy clothing '${id}'`);
  const paid = spendLeaves(state, clothingPrice(id));
  return { ...paid, ownedClothing: CLOTHING_IDS.filter(item => item === id || paid.ownedClothing.includes(item)) };
}

/** Locked cards cannot bypass ownership by reaching their click handler. */
export function toggleClothing(state: GameState, id: ClothingId): GameState {
  if (!state.ownedClothing.includes(id)) return state;
  const slot = CLOTHING[id].slot;
  return { ...state, outfit: equip(state.outfit, slot, state.outfit[slot] === id ? null : id) };
}
