import Phaser from 'phaser';
import { COLORS, TEXT, css } from './theme';

const WIDTH = 72;
const HEIGHT = 22;

/**
 * The day clock, as a small panel matching the wallet: "9:40". After closing
 * time a red "Closed" appears under it. (x, y) is its top-left corner.
 * Like WalletDisplay, it only draws: the scene tells it what to show.
 */
export class ClockDisplay extends Phaser.GameObjects.Container {
  private readonly time: Phaser.GameObjects.Text;
  private readonly closed: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    const panel = scene.add
      .rectangle(0, 0, WIDTH, HEIGHT, COLORS.paper)
      .setOrigin(0)
      .setStrokeStyle(2, COLORS.ink);
    this.time = scene.add.text(WIDTH / 2, HEIGHT / 2, '', TEXT.heading).setOrigin(0.5);
    this.closed = scene.add
      .text(WIDTH / 2, HEIGHT + 3, 'Closed', {
        ...TEXT.label,
        color: css(COLORS.statusUpset),
        stroke: css(COLORS.ink),
        strokeThickness: 3,
      })
      .setOrigin(0.5, 0)
      .setVisible(false);
    this.add([panel, this.time, this.closed]);
    this.setDepth(30);
    scene.add.existing(this);
  }

  /** Cheap to call every frame: the texts are only redrawn when they change. */
  show(clock: string, open: boolean): void {
    if (this.time.text !== clock) this.time.setText(clock);
    this.closed.setVisible(!open);
  }
}
