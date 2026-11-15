import Phaser from 'phaser';
import { addJournalImage } from './journalImage';

/** Independent of player names, ready for later nameplate presentation. */
export class PlayerTitlePlate extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);
    scene.add.existing(this);
    this.add(addJournalImage(scene, 0, 0, 'masterCollectorRibbon'));
  }
}
