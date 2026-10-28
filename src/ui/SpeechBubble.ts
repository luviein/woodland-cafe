import Phaser from 'phaser';
import { COLORS, TEXT } from './theme';

const PADDING = 10;
const TAIL_SIZE = 10;

/**
 * Rounded box with a tail on the left pointing at the customer.
 * (x, y) is the top-left corner of the box.
 */
export class SpeechBubble extends Phaser.GameObjects.Container {
  private readonly text: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number, width: number, height: number) {
    super(scene, x, y);

    const g = scene.add.graphics();
    g.fillStyle(COLORS.paper);
    g.lineStyle(2, COLORS.ink);
    g.fillRoundedRect(0, 0, width, height, 8);
    g.strokeRoundedRect(0, 0, width, height, 8);
    // Tail: a triangle poking out of the left edge. Drawn after the box so it
    // covers the box's outline where they join.
    const tailY = height / 2;
    g.fillTriangle(1, tailY - TAIL_SIZE / 2, 1, tailY + TAIL_SIZE / 2, -TAIL_SIZE, tailY);
    g.lineBetween(0, tailY - TAIL_SIZE / 2, -TAIL_SIZE, tailY);
    g.lineBetween(0, tailY + TAIL_SIZE / 2, -TAIL_SIZE, tailY);

    this.text = scene.add.text(PADDING, PADDING, '', {
      ...TEXT.body,
      wordWrap: { width: width - PADDING * 2 },
      lineSpacing: 3,
    });

    this.add([g, this.text]);
    scene.add.existing(this);
  }

  /** Each entry is one sentence from buildSpeech(); shown as one paragraph. */
  setLines(lines: readonly string[]): void {
    this.text.setText(lines.join(' '));
  }
}
