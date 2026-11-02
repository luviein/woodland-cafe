import Phaser from 'phaser';
import { addArt } from './art';
import { COLORS, TEXT } from './theme';

const WIDTH = 72;
const HEIGHT = 22;

/**
 * The wallet, as a small panel: the leaf (the same as the ones on the
 * ground) and the amount, e.g. "(leaf) 12". (x, y) is its top-left corner.
 * Just draws a number; the scene keeps it in sync with the game state (see
 * watchGameState in scenes/gameStore.ts).
 */
export class WalletDisplay extends Phaser.GameObjects.Container {
  private readonly text: Phaser.GameObjects.Text;
  private readonly leaf: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    const panel = scene.add
      .rectangle(0, 0, WIDTH, HEIGHT, COLORS.paper)
      .setOrigin(0)
      .setStrokeStyle(2, COLORS.ink);
    this.leaf = addArt(scene, 0, HEIGHT / 2, 'leaf').setOrigin(0, 0.5);
    this.text = scene.add.text(0, HEIGHT / 2, '', TEXT.heading).setOrigin(0, 0.5);
    this.add([panel, this.leaf, this.text]);
    this.setDepth(30); // above the floor and its characters
    scene.add.existing(this);
  }

  setLeaves(leaves: number): void {
    // The leaf and the amount, centred together in the panel.
    this.text.setText(String(leaves));
    const gap = 4;
    const left = Math.round((WIDTH - this.leaf.displayWidth - gap - this.text.width) / 2);
    this.leaf.setX(left);
    this.text.setX(left + this.leaf.displayWidth + gap);
  }
}
