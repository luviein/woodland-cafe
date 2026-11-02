import type { Point } from '../logic/layout';
import { layoutPoint } from '../layout/positions';
import type { IngredientId } from './ingredients';
import type { OutdoorLocationId } from './outdoorAreas';

// Spots outdoors where ingredients can be gathered (GAME_DESIGN.md §5.5).
// Each can be gathered once a day and grows back the next. Adding a spot is
// adding an entry here; a new `kind` also needs a sprite of that name in
// art/spriteArt.ts (frame 0 full, frame 1 bare).

/** How a spot looks: the name of its sprite. */
export type ForageKind = 'mushroomPatch' | 'berryBush';

export interface ForageSpotDef {
  /** Unique, and kept stable: the game state remembers gathered spots by id. */
  id: string;
  location: OutdoorLocationId;
  kind: ForageKind;
  /** Centre of the base of the spot (where it touches the ground), in pixels (movable in Arrange mode, GAME_DESIGN.md §9.3). */
  readonly position: Point;
  ingredient: IngredientId;
  amount: number;
}

/** A spot whose position is read by name (spot.<id>) each time, so a move in Arrange mode counts. */
function spot(id: string, location: OutdoorLocationId, kind: ForageKind, at: Point, ingredient: IngredientId, amount: number): ForageSpotDef {
  return {
    id,
    location,
    kind,
    get position() {
      return layoutPoint(location, `spot.${id}`, at);
    },
    ingredient,
    amount,
  };
}

export const FORAGE_SPOTS: readonly ForageSpotDef[] = [
  spot('forestMushrooms1', 'forest', 'mushroomPatch', { x: 120, y: 150 }, 'mushroom', 2),
  spot('forestMushrooms2', 'forest', 'mushroomPatch', { x: 290, y: 250 }, 'mushroom', 2),
  spot('forestMushrooms3', 'forest', 'mushroomPatch', { x: 400, y: 160 }, 'mushroom', 2),
  spot('forestMushrooms4', 'forest', 'mushroomPatch', { x: 560, y: 300 }, 'mushroom', 2),
  // The cafe makes its jam from these berries.
  spot('forestBerries1', 'forest', 'berryBush', { x: 220, y: 190 }, 'jam', 2),
  spot('forestBerries2', 'forest', 'berryBush', { x: 500, y: 210 }, 'jam', 2),
];

export type ForageConfig = {
  /** Seconds to gather a spot, once standing next to it. */
  forageSeconds: number;
};

export const FORAGE_CONFIG: ForageConfig = {
  forageSeconds: 1,
};
