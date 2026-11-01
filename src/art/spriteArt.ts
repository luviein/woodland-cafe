import type { PixelSprite } from './pixelSprite';
import { CHAIR, COUNTER, DOOR, FLOOR, MESS, ORDER_RUG, PAW_PRINT, PLATE, TABLE, WALL } from './sprites/cafe';
import { LEAF } from './sprites/outdoor';

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
  // Outdoors
  leaf: LEAF,
} satisfies Record<string, PixelSprite>;

export type ArtName = keyof typeof SPRITE_ART;

export const ART_NAMES = Object.keys(SPRITE_ART) as ArtName[];

export function isArtName(name: string): name is ArtName {
  return name in SPRITE_ART;
}
