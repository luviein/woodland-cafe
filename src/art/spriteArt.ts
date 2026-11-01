import type { PixelSprite } from './pixelSprite';
import { LEAF } from './sprites/outdoor';

// Every code-drawn sprite, by name. The name is also the file name a
// hand-drawn replacement uses: src/art/drawn/<name>.png (GAME_DESIGN.md §8.2).

export const SPRITE_ART = {
  leaf: LEAF,
} satisfies Record<string, PixelSprite>;

export type ArtName = keyof typeof SPRITE_ART;

export const ART_NAMES = Object.keys(SPRITE_ART) as ArtName[];

export function isArtName(name: string): name is ArtName {
  return name in SPRITE_ART;
}
