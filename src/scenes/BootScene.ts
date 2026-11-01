import Phaser from 'phaser';
import { DRAWN_ART } from '../art/drawnArt';
import { spriteSize } from '../art/pixelSprite';
import { ART_NAMES, isArtName, SPRITE_ART } from '../art/spriteArt';
import { artKey, buildArtTexture } from '../ui/art';

/**
 * The very first scene: gets every sprite's texture ready, then opens the
 * title screen. A hand-drawn PNG in src/art/drawn/ is loaded in place of the
 * code-drawn sprite with the same name (GAME_DESIGN.md §8.2).
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    for (const [name, url] of DRAWN_ART) {
      if (!isArtName(name)) {
        console.warn(`src/art/drawn/${name}.png has no sprite of that name, so it isn't used`);
        continue;
      }
      // Cut into frames the size of the code sprite, numbered like its frames.
      const { width, height } = spriteSize(SPRITE_ART[name]);
      this.load.spritesheet(artKey(name), url, { frameWidth: width, frameHeight: height });
    }
  }

  create(): void {
    // Code-drawn art for everything that has no PNG (or whose PNG failed to load).
    for (const name of ART_NAMES) {
      if (!this.textures.exists(artKey(name))) buildArtTexture(this.textures, name);
    }
    this.scene.start('TitleScene');
  }
}
