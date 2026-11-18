import Phaser from 'phaser';
import { MAP_IMAGE_KEY, MAP_WALLET_PAPER } from '../assets/worldMap';
import { LeafText } from './LeafText';
import { TEXT } from './theme';

/** Keep the approved wallet frame, replacing only its baked-in example amount. */
export class IllustratedMapWallet extends Phaser.GameObjects.Container {
  private readonly amount: LeafText;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    const paper = scene.add.image(0, 0, MAP_IMAGE_KEY, MAP_WALLET_PAPER.name).setDisplaySize(58, 16);
    this.amount = new LeafText(scene, 0, 0, '', { ...TEXT.heading, fontSize: '14px', color: '#361c0c', resolution: 2 }, 0.5, 0.5);
    this.add([paper, this.amount]);
    this.setDepth(30);
    scene.add.existing(this);
  }

  setLeaves(leaves: number): void {
    this.amount.setText(`🍃 ${leaves}`);
    this.amount.setScale(Math.min(1, 54 / Math.max(1, this.amount.blockWidth)));
  }
}
