import Phaser from 'phaser';
import { JOURNAL_IMAGES, JOURNAL_IMAGE_FRAMES, journalImageKey, type JournalImageName } from '../assets/journal';
import { DRAWN_ART } from '../art/drawnArt';
import { spriteSize } from '../art/pixelSprite';
import { ART_NAMES, isArtName, SPRITE_ART } from '../art/spriteArt';
import { artKey, buildArtTexture } from '../ui/art';
import { PREP_LAYER_IMAGES, prepLayerLayout } from '../assets/prep';
import { LAYER_LEFT, LAYER_MIDDLE, LAYER_RIGHT } from '../art/sprites/kitchen';

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
    for (const name of Object.keys(JOURNAL_IMAGES) as JournalImageName[]) {
      this.load.image(journalImageKey(name), JOURNAL_IMAGES[name]);
    }
    for (const [name, url] of DRAWN_ART) {
      if (!isArtName(name)) {
        console.warn(`src/art/drawn/${name}.png has no sprite of that name, so it isn't used`);
        continue;
      }
      // Cut into frames the size of the code sprite, numbered like its frames.
      const { width, height } = spriteSize(SPRITE_ART[name]);
      this.load.spritesheet(artKey(name), url, { frameWidth: width, frameHeight: height });
    }
    for (const name of Object.keys(PREP_LAYER_IMAGES) as (keyof typeof PREP_LAYER_IMAGES)[]) {
      if (!DRAWN_ART.has(name)) this.load.image(artKey(name), PREP_LAYER_IMAGES[name]);
    }
  }

  create(): void {
    for (const name of Object.keys(JOURNAL_IMAGE_FRAMES) as JournalImageName[]) {
      const frame = JOURNAL_IMAGE_FRAMES[name]!;
      this.textures.get(journalImageKey(name)).add('ribbon', 0, frame.x, frame.y, frame.width, frame.height);
    }
    // These full-resolution images preserve approved artwork. Smooth only
    // their downscaling; critters, tiles and the rest of the pixel art stay crisp.
    for (const name of ['goldenCollectionBadge', 'christmasCollectionBadge', 'masterCollectorRibbon', 'masterCollectorWorldRibbon'] as const) {
      this.textures.get(journalImageKey(name)).setFilter(Phaser.Textures.FilterMode.LINEAR);
    }
    // Approved full strips use narrow caps and a detailed middle instead of equal-sized frames.
    for (const name of Object.keys(PREP_LAYER_IMAGES) as (keyof typeof PREP_LAYER_IMAGES)[]) {
      if (DRAWN_ART.has(name) || !this.textures.exists(artKey(name))) continue;
      const texture = this.textures.get(artKey(name));
      const { width, height, leftWidth, rightWidth } = prepLayerLayout(name);
      texture.add(LAYER_LEFT, 0, 0, 0, leftWidth, height);
      texture.add(LAYER_MIDDLE, 0, leftWidth, 0, width - leftWidth - rightWidth, height);
      texture.add(LAYER_RIGHT, 0, width - rightWidth, 0, rightWidth, height);
      texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    // Code-drawn art for everything that has no PNG (or whose PNG failed to load).
    for (const name of ART_NAMES) {
      if (!this.textures.exists(artKey(name))) buildArtTexture(this.textures, name);
    }
    // The volume control runs alongside every other scene from now on.
    this.scene.launch('HudScene');
    this.scene.start('TitleScene');
  }
}
