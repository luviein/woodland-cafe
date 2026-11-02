import type Phaser from 'phaser';
import { CHRISTMAS_VENDOR } from '../data/stallVendors';
import { SPRITE_ART } from '../art/spriteArt';
import { spriteSize } from '../art/pixelSprite';
import { artKey } from './art';
import { arrangeable } from '../layout/arrangeable';
import { vendorIdlePose } from '../logic/vendorIdle';

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
  let elapsed = 0;
  let previous = '';
  const animate = (_time: number, delta: number) => {
    elapsed += delta;
    const pose = vendorIdlePose(elapsed);
    const key = `${pose.frame}:${pose.lift}`;
    if (key === previous) return;
    previous = key;
    // Move the drawing within the crop, rather than the crop itself: the
    // counter, hit area and saved Arrange position must remain stationary.
    vendor.clear().drawFrame(artKey(art), pose.frame, Math.floor((crop.width - size.width) / 2), -crop.sourceY + pose.lift);
  };
  scene.events.on('update', animate);
  const stop = () => scene.events.off('update', animate);
  vendor.once('destroy', stop);
  scene.events.once('shutdown', stop);
  return vendor;
}
