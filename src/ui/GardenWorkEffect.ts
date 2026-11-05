import Phaser from 'phaser';
import { gardenWorkProgress, type GardenWork } from '../logic/gardenWork';
import { addArt } from './art';
import { COLORS, TEXT } from './theme';

/** Reused during tending; no tweens can outlive a cancelled action. */
export class GardenWorkEffect extends Phaser.GameObjects.Container {
  private tool: Phaser.GameObjects.Image;
  private particles: Phaser.GameObjects.Image[];
  private fill: Phaser.GameObjects.Rectangle;
  private label: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);
    scene.add.existing(this);
    this.setVisible(false).setDepth(600);
    this.tool = addArt(scene, 14, 12, 'gardenWorkTools');
    this.particles = [0, 1, 2].map(() => addArt(scene, 0, 0, 'gardenWorkParticles'));
    this.fill = scene.add.rectangle(-13, -26, 26, 2, COLORS.serve).setOrigin(0, 0.5);
    this.label = scene.add.text(0, -36, '', { ...TEXT.label, fontSize: '9px', stroke: '#493026', strokeThickness: 2 }).setOrigin(0.5);
    this.add([this.tool, ...this.particles, scene.add.rectangle(0, -26, 30, 5, COLORS.ink), this.fill, this.label]);
  }

  show(work: GardenWork): void {
    const progress = gardenWorkProgress(work), frame = { plant: 0, water: 1, harvest: 2 }[work.action];
    this.setVisible(true);
    this.label.setText({ plant: 'Planting', water: 'Watering', harvest: 'Harvesting' }[work.action]);
    this.tool.setFrame(frame).setPosition(14, 12 + Math.floor(progress * 8) % 2 * 2);
    this.fill.setScale(Math.max(0.001, progress), 1);
    this.particles.forEach((particle, i) => {
      const phase = (progress * 3 + i / 3) % 1;
      particle.setFrame(frame).setPosition(-8 + i * 6, work.action === 'harvest' ? -4 - Math.floor(phase * 12) : -14 + Math.floor(phase * 10));
    });
  }
}
