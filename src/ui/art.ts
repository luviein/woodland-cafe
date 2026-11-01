import type Phaser from 'phaser';
import { framePixels, spriteSize } from '../art/pixelSprite';
import { SPRITE_ART, type ArtName } from '../art/spriteArt';
import type { IngredientId } from '../data/ingredients';
import { css } from './theme';

// Turning sprite art into Phaser textures, and putting it on screen. The
// Boot scene makes one texture per sprite name before any other scene
// starts, so scenes can simply add art by name.

/** Texture key for a sprite (prefixed, so it can't clash with other textures). */
export const artKey = (name: ArtName): string => `art:${name}`;

/**
 * Draws a code sprite into a new canvas texture: frames side by side, each
 * one registered as frame 0, 1, 2... (the same numbering a loaded sprite
 * sheet gets, so a hand-drawn PNG is a drop-in replacement).
 */
export function buildArtTexture(textures: Phaser.Textures.TextureManager, name: ArtName): void {
  const sprite = SPRITE_ART[name];
  const { width, height } = spriteSize(sprite);
  const texture = textures.createCanvas(artKey(name), width * sprite.frames.length, height);
  if (!texture) return;
  const context = texture.getContext();
  sprite.frames.forEach((_, frame) => {
    for (const pixel of framePixels(sprite, frame)) {
      context.fillStyle = css(pixel.color);
      context.fillRect(frame * width + pixel.x, pixel.y, 1, 1);
    }
    texture.add(frame, 0, frame * width, 0, width, height);
  });
  texture.refresh(); // upload the drawn pixels to the GPU
}

/** A dish layer's art. Toasting only changes how bread looks (GAME_DESIGN.md §3.4). */
export function layerArt(id: IngredientId, toasted: boolean): ArtName {
  return toasted && id === 'bread' ? 'breadToastedLayer' : `${id}Layer`;
}

/** Adds a sprite's art, centred on (x, y). */
export function addArt(scene: Phaser.Scene, x: number, y: number, name: ArtName, frame = 0): Phaser.GameObjects.Image {
  return scene.add.image(x, y, artKey(name), frame);
}
