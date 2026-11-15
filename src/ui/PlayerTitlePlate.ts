import Phaser from 'phaser';
import words from '../data/texts/fieldJournal.json';
import { addArt } from './art';
import { TEXT } from './theme';

/** Independent of player names, ready for later nameplate presentation. */
export class PlayerTitlePlate extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);
    scene.add.existing(this);
    this.add(scene.add.rectangle(0, 0, 160, 32, 0x493026).setStrokeStyle(1, 0xe7b66b));
    this.add(scene.add.rectangle(0, 0, 154, 26, 0xffe3ac));
    this.add(addArt(scene, -60, 0, 'collectorBadge'));
    this.add(scene.add.text(-40, 0, words.masterCollector,
      { ...TEXT.body, color: '#493026', fontSize: '10px' }).setOrigin(0, 0.5));
  }
}
