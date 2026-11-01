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
  POINTER_ARROW,
  PUFF,
  SPEAKER,
  STORE_ICON,
  TABLE,
  WALL,
} from './sprites/cafe';
import { BADGER, FOX, FROG, RACCOON } from './sprites/sheetCritters2';
import { DEER, HEDGEHOG, MOUSE, RABBIT } from './sprites/sheetCritters';
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
  puff: PUFF,
  pointerArrow: POINTER_ARROW,
  speaker: SPEAKER,
  moveIcon: MOVE_ICON,
  storeIcon: STORE_ICON,
  // The cast, four views each (GAME_DESIGN.md §8.2)
  hedgehog: HEDGEHOG,
  raccoon: RACCOON,
  frog: FROG,
  fox: FOX,
  rabbit: RABBIT,
  mouse: MOUSE,
  deer: DEER,
  badger: BADGER,
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

/**
 * Critters drawn in four views (front, back, left, right: VIEW in
 * sheetCritters.ts), each standing plus two steps, who face the way they
 * walk. The rest are 16x24 with a standing frame and two steps, facing right.
 */
export const VIEW_ART: ReadonlySet<ArtName> = new Set<ArtName>([
  'hedgehog',
  'rabbit',
  'mouse',
  'deer',
  'badger',
  'raccoon',
  'frog',
  'fox',
]);

/** The animals customers can be (GAME_DESIGN.md §8.2). */
export const CUSTOMER_ART = ['fox', 'rabbit', 'deer', 'mouse'] as const satisfies readonly ArtName[];
export type CustomerArt = (typeof CUSTOMER_ART)[number];

/**
 * Which animal a customer is, from their id: the same on the floor and at
 * the prep station. Stepping by 3 (which shares no factor with 4) mixes
 * them up, so customers in a row aren't always fox, rabbit, deer, mouse.
 */
export function customerArt(id: number): CustomerArt {
  return CUSTOMER_ART[(id * 3) % CUSTOMER_ART.length];
}
