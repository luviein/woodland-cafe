import Phaser from 'phaser';
import { addArt } from './art';

/** Independent of player names, ready for later nameplate presentation. */
export class PlayerTitlePlate extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);
    scene.add.existing(this);
    this.add(addArt(scene, 0, 0, 'masterCollectorRibbon'));
  }
}
