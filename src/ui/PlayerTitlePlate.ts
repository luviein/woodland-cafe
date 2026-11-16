import Phaser from 'phaser';
import { addJournalImage, setJournalImage } from './journalImage';
import { TITLE_RIBBONS, titleDisplayWidth } from './titleArt';
import type { PlayerTitle } from '../logic/playerTitles';

/** Independent of player names, ready for later nameplate presentation. */
export class PlayerTitlePlate extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, title: PlayerTitle = 'masterCollector') {
    super(scene, 0, 0);
    scene.add.existing(this);
    const image = addJournalImage(scene, 0, 0, TITLE_RIBBONS[title]);
    this.add(setJournalImage(image, TITLE_RIBBONS[title], titleDisplayWidth(title, 'journal')));
  }
}
