import type Phaser from 'phaser';
import { journalImageKey, type JournalImageName } from '../assets/journal';

/** Direct image loading keeps the approved PNG's colours and transparency. */
export function addJournalImage(scene: Phaser.Scene, x: number, y: number, name: JournalImageName): Phaser.GameObjects.Image {
  return scene.add.image(x, y, journalImageKey(name));
}
