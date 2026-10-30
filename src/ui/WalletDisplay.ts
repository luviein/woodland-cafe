import Phaser from 'phaser';
import { COLORS, TEXT } from './theme';

const WIDTH = 72;
const HEIGHT = 22;

/**
 * The wallet, as a small panel: "🍃 12". (x, y) is its top-left corner.
 * Just draws a number; the scene keeps it in sync with the game state (see
 * watchGameState in scenes/gameStore.ts).
 */
export class WalletDisplay extends Phaser.GameObjects.Container {
  private readonly text: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    const panel = scene.add
      .rectangle(0, 0, WIDTH, HEIGHT, COLORS.paper)
      .setOrigin(0)
      .setStrokeStyle(2, COLORS.ink);
    this.text = scene.add.text(WIDTH / 2, HEIGHT / 2, '', TEXT.heading).setOrigin(0.5);
    this.add([panel, this.text]);
    this.setDepth(30); // above the floor and its characters
    scene.add.existing(this);
  }

  setLeaves(leaves: number): void {
    this.text.setText(`🍃 ${leaves}`);
  }
}
