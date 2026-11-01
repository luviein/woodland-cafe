import type { PixelSprite } from './pixelSprite';
import {
  CHAIR,
  COUNTER,
  DOOR,
  FLOOR,
  MESS,
  MOVE_ICON,
  ORDER_RUG,
  PAW_PRINT,
  PLATE,
  STORE_ICON,
  TABLE,
  WALL,
} from './sprites/cafe';
import { FOX, FROG, HEDGEHOG, MOUSE, RABBIT, RACCOON, SQUIRREL } from './sprites/critters';
import { INGREDIENT_ICONS, INGREDIENT_LAYERS, TOASTED_BREAD_LAYER, TOASTER } from './sprites/kitchen';
import { BERRY_BUSH, CAFE_HOUSE, FOREST_FLOOR, GRASS, LEAF, MAP_TREE, MUSHROOM_PATCH, STALL, TREE } from './sprites/outdoor';

// Every code-drawn sprite, by name. The name is also the file name a
// hand-drawn replacement uses: src/art/drawn/<name>.png (GAME_DESIGN.md §8.2).

export const SPRITE_ART = {
  // Cafe
  floor: FLOOR,
  wall: WALL,
  door: DOOR,
  counter: COUNTER,
  table: TABLE,
  chair: CHAIR,
  orderRug: ORDER_RUG,
  pawPrint: PAW_PRINT,
  mess: MESS,
  plate: PLATE,
  moveIcon: MOVE_ICON,
  storeIcon: STORE_ICON,
  // The cast: 16x24, frames 0 standing, 1-2 walking (GAME_DESIGN.md §8.2)
  hedgehog: HEDGEHOG,
  raccoon: RACCOON,
  frog: FROG,
  fox: FOX,
  rabbit: RABBIT,
  squirrel: SQUIRREL,
  mouse: MOUSE,
  // Prep station: bin icons are named after their ingredient
  ...INGREDIENT_ICONS,
  breadLayer: INGREDIENT_LAYERS.bread,
  breadToastedLayer: TOASTED_BREAD_LAYER,
  mushroomLayer: INGREDIENT_LAYERS.mushroom,
  jamLayer: INGREDIENT_LAYERS.jam,
  chilliLayer: INGREDIENT_LAYERS.chilli,
  tunaLayer: INGREDIENT_LAYERS.tuna,
  tomatoLayer: INGREDIENT_LAYERS.tomato,
  toaster: TOASTER,
  // Outdoors and the world map
  leaf: LEAF,
  grass: GRASS,
  forestFloor: FOREST_FLOOR,
  tree: TREE,
  mapTree: MAP_TREE,
  mushroomPatch: MUSHROOM_PATCH,
  berryBush: BERRY_BUSH,
  stall: STALL,
  cafeHouse: CAFE_HOUSE,
} satisfies Record<string, PixelSprite>;

export type ArtName = keyof typeof SPRITE_ART;

export const ART_NAMES = Object.keys(SPRITE_ART) as ArtName[];

export function isArtName(name: string): name is ArtName {
  return name in SPRITE_ART;
}

/** The animals customers can be (GAME_DESIGN.md §8.2). */
export const CUSTOMER_ART = ['fox', 'rabbit', 'squirrel', 'mouse'] as const satisfies readonly ArtName[];
export type CustomerArt = (typeof CUSTOMER_ART)[number];

/**
 * Which animal a customer is, from their id: the same on the floor and at
 * the prep station. Stepping by 3 (which shares no factor with 4) mixes
 * them up, so customers in a row aren't always fox, rabbit, squirrel, mouse.
 */
export function customerArt(id: number): CustomerArt {
  return CUSTOMER_ART[(id * 3) % CUSTOMER_ART.length];
}
