import { CROP_IDS, SPECIAL_VARIANTS } from '../data/crops';
import { INGREDIENT_IDS, INGREDIENTS } from '../data/ingredients';
import { cropArtName, cropName } from './garden';
import type { GameState } from './gameState';

export type InventoryTab = 'ingredients' | 'seasonal';
export interface InventoryEntry { id: string; name: string; art: string; amount: number; locked: boolean }

/** Read the saved source of each count; special crops never become cooking stock. */
export function inventoryEntries(state: GameState, tab: InventoryTab): InventoryEntry[] {
  if (tab === 'ingredients') return INGREDIENT_IDS.map(id => ({
    id, name: INGREDIENTS[id].name, art: id, amount: state.stock[id], locked: !state.ingredients.includes(id),
  }));
  return SPECIAL_VARIANTS.flatMap(variant => CROP_IDS.map(crop => ({
    id: `${variant}.${crop}`, name: cropName(crop, variant), art: cropArtName(crop, variant),
    amount: state.garden.harvests[variant][crop], locked: false,
  })));
}
