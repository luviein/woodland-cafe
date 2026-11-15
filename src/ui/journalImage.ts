import type Phaser from 'phaser';
import { JOURNAL_DISPLAY_WIDTHS, journalImageKey, type JournalImageName } from '../assets/journal';

/** Direct image loading keeps the approved PNG's colours and transparency. */
export function addJournalImage(scene: Phaser.Scene, x: number, y: number, name: JournalImageName): Phaser.GameObjects.Image {
  return setJournalImage(scene.add.image(x, y, journalImageKey(name)), name);
}

export function setJournalImage(image: Phaser.GameObjects.Image, name: JournalImageName, displayWidth?: number): Phaser.GameObjects.Image {
  image.setTexture(journalImageKey(name));
  const width = displayWidth ?? JOURNAL_DISPLAY_WIDTHS[name] ?? image.width;
  return image.setDisplaySize(width, image.height * width / image.width);
}
