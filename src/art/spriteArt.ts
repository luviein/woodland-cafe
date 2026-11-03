import { ROOM_FINISH_ART } from './sprites/roomFinishes';
import type { PixelSprite } from './pixelSprite';
import { CATALOGUE_SAMPLES } from './sprites/catalogueSamples';
import { CRITTER_SKELETON } from './sprites/critterSkeleton';
import { DEER_VENDOR_IDLE } from './sprites/stallVendorIdle';
import { COLLECTION_ART } from './sprites/christmasClothing';
import { FOX_SANTA_COAT, FOX_SANTA_HAT } from './sprites/foxClothing';
import { HEDGEHOG_SANTA_PREVIEW, SANTA_COAT, SANTA_HAT } from './sprites/wardrobe';
import {
  DEER_SANTA_COAT, DEER_SANTA_HAT, DEER_SANTA_PREVIEW,
  MOUSE_SANTA_COAT, MOUSE_SANTA_HAT, MOUSE_SANTA_PREVIEW,
  RABBIT_SANTA_COAT, RABBIT_SANTA_HAT, RABBIT_SANTA_PREVIEW,
} from './sprites/wardrobeCritters';
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
import {
  BAUBLES,
  CHAIR_WITH_BOW,
  CHRISTMAS_STALL,
  CHRISTMAS_TREE,
  FAIRY_LIGHTS,
  GIFT_BOXES,
  LANTERN,
  PINE_GARLAND,
  POINSETTIA,
  SNOWMAN,
  SNOW_GLOBE,
  STOCKINGS,
  TABLE_AND_CANDLE,
  TREE_PICTURE,
  WREATH,
} from './sprites/christmas';
import { DEER, HEDGEHOG, MOUSE, RABBIT } from './sprites/sheetCritters';
import { INGREDIENT_ICONS, INGREDIENT_LAYERS, TOASTED_BREAD_LAYER, TOASTER } from './sprites/kitchen';
import { CARPENTER_STALL, NOTICE_BOARD, PANTRY_STALL, SPECIALTY_STALL, TOOLS_STALL } from './sprites/marketStalls';
import { BERRY_BUSH, CAFE_HOUSE, FOREST_FLOOR, GRASS, LEAF, MAP_TREE, MUSHROOM_PATCH, STALL, TREE } from './sprites/outdoor';

// Every code-drawn sprite, by name. The name is also the file name a
// hand-drawn replacement uses: src/art/drawn/<name>.png (GAME_DESIGN.md §8.2).

export const SPRITE_ART = {
  ...ROOM_FINISH_ART,
  ...CATALOGUE_SAMPLES,
  critterSkeleton: CRITTER_SKELETON,
  deerVendorIdle: DEER_VENDOR_IDLE,
  ...COLLECTION_ART,
  foxSantaHat: FOX_SANTA_HAT,
  foxSantaCoat: FOX_SANTA_COAT,
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
  santaHat: SANTA_HAT,
  santaCoat: SANTA_COAT,
  hedgehogSantaPreview: HEDGEHOG_SANTA_PREVIEW,
  rabbitSantaHat: RABBIT_SANTA_HAT,
  rabbitSantaCoat: RABBIT_SANTA_COAT,
  rabbitSantaPreview: RABBIT_SANTA_PREVIEW,
  mouseSantaHat: MOUSE_SANTA_HAT,
  mouseSantaCoat: MOUSE_SANTA_COAT,
  mouseSantaPreview: MOUSE_SANTA_PREVIEW,
  deerSantaHat: DEER_SANTA_HAT,
  deerSantaCoat: DEER_SANTA_COAT,
  deerSantaPreview: DEER_SANTA_PREVIEW,
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
  // The Marketplace's stalls, each its own (the plain stall stays for the world map)
  pantryStall: PANTRY_STALL,
  specialtyStall: SPECIALTY_STALL,
  toolsStall: TOOLS_STALL,
  carpenterStall: CARPENTER_STALL,
  noticeBoard: NOTICE_BOARD,
  cafeHouse: CAFE_HOUSE,
  // The Christmas edition (GAME_DESIGN.md §5.10)
  christmasTree: CHRISTMAS_TREE,
  snowman: SNOWMAN,
  chairWithBow: CHAIR_WITH_BOW,
  tableAndCandle: TABLE_AND_CANDLE,
  pineGarland: PINE_GARLAND,
  fairyLights: FAIRY_LIGHTS,
  stockings: STOCKINGS,
  baubles: BAUBLES,
  giftBoxes: GIFT_BOXES,
  wreath: WREATH,
  lantern: LANTERN,
  treePicture: TREE_PICTURE,
  snowGlobe: SNOW_GLOBE,
  poinsettia: POINSETTIA,
  christmasStall: CHRISTMAS_STALL,
} satisfies Record<string, PixelSprite>;

export type ArtName = keyof typeof SPRITE_ART;

export const ART_NAMES = Object.keys(SPRITE_ART) as ArtName[];

export function isArtName(name: string): name is ArtName {
  return name in SPRITE_ART;
}

/**
 * Critters drawn in four views (front, back, left, right: VIEW in
 * sheetCritters.ts), each standing plus two steps, who face the way they
 * walk.
 */
export const VIEW_ART: ReadonlySet<ArtName> = new Set<ArtName>([
  'hedgehog',
  'hedgehogSantaPreview',
  'rabbitSantaPreview',
  'mouseSantaPreview',
  'deerSantaPreview',
  'rabbit',
  'mouse',
  'deer',
  'badger',
  'raccoon',
  'frog',
  'fox',
]);

/** The Christmas edition's art (GAME_DESIGN.md §5.10), converted from the player's drawings. */
export const CHRISTMAS_ART = [
  'christmasTree',
  'snowman',
  'chairWithBow',
  'tableAndCandle',
  'pineGarland',
  'fairyLights',
  'stockings',
  'baubles',
  'giftBoxes',
  'wreath',
  'lantern',
  'treePicture',
  'snowGlobe',
  'poinsettia',
  'christmasStall',
] as const satisfies readonly ArtName[];

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
