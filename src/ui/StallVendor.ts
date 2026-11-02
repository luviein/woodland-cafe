import type Phaser from 'phaser';
import { CHRISTMAS_VENDOR } from '../data/stallVendors';
import { SPRITE_ART } from '../art/spriteArt';
import { spriteSize } from '../art/pixelSprite';
import { artKey } from './art';
import { arrangeable } from '../layout/arrangeable';

/** Crop the vendor to the stall opening so its roof and counter remain in front. */
export function addChristmasVendor(scene: Phaser.Scene, depth: number, onTap: () => void): Phaser.GameObjects.RenderTexture {
  const { art, crop, position } = CHRISTMAS_VENDOR;
  const size = spriteSize(SPRITE_ART[art]);
  const vendor = scene.add.renderTexture(position.x, position.y, crop.width, crop.height)
    .setName('christmasVendor').setOrigin(0.5).setDepth(depth + 0.1)
    .drawFrame(artKey(art), 0, Math.floor((crop.width - size.width) / 2), -crop.sourceY)
    .setInteractive({ useHandCursor: true })
    .on('pointerup', onTap);
  arrangeable(scene, 'marketplace', 'vendor.christmas', position, vendor);
  return vendor;
}
