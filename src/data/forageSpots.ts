import type { Point } from '../logic/layout';
import type { IngredientId } from './ingredients';
import type { OutdoorLocationId } from './outdoorAreas';

// Spots outdoors where ingredients can be gathered (GAME_DESIGN.md §5.5).
// Each can be gathered once a day and grows back the next. Adding a spot is
// adding an entry here; a new `kind` also needs a drawing in ui/sprites.ts.

/** How a spot looks (until real art): what's drawn, full and bare. */
export type ForageKind = 'mushroomPatch' | 'berryBush';

export interface ForageSpotDef {
  /** Unique, and kept stable: the game state remembers gathered spots by id. */
  id: string;
  location: OutdoorLocationId;
  kind: ForageKind;
  /** Centre of the base of the spot (where it touches the ground), in pixels. */
  position: Point;
  ingredient: IngredientId;
  amount: number;
}

export const FORAGE_SPOTS: readonly ForageSpotDef[] = [
  { id: 'forestMushrooms1', location: 'forest', kind: 'mushroomPatch', position: { x: 120, y: 150 }, ingredient: 'mushroom', amount: 2 },
  { id: 'forestMushrooms2', location: 'forest', kind: 'mushroomPatch', position: { x: 290, y: 250 }, ingredient: 'mushroom', amount: 2 },
  { id: 'forestMushrooms3', location: 'forest', kind: 'mushroomPatch', position: { x: 400, y: 160 }, ingredient: 'mushroom', amount: 2 },
  { id: 'forestMushrooms4', location: 'forest', kind: 'mushroomPatch', position: { x: 560, y: 300 }, ingredient: 'mushroom', amount: 2 },
  // The cafe makes its jam from these berries.
  { id: 'forestBerries1', location: 'forest', kind: 'berryBush', position: { x: 220, y: 190 }, ingredient: 'jam', amount: 2 },
  { id: 'forestBerries2', location: 'forest', kind: 'berryBush', position: { x: 500, y: 210 }, ingredient: 'jam', amount: 2 },
];

export type ForageConfig = {
  /** Seconds to gather a spot, once standing next to it. */
  forageSeconds: number;
};

export const FORAGE_CONFIG: ForageConfig = {
  forageSeconds: 1,
};
