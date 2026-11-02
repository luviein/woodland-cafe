import Phaser from 'phaser';
import { addArt } from './art';

/** Where Leaves appear in a string: written as this emoji, drawn as the leaf sprite. */
export const LEAF = '🍃';

/**
 * Text with Leaves in it, e.g. "+1 🍃" or "Wallet: 🍃 120": each 🍃 is drawn
 * as the leaf sprite from the ground (art 'leaf'), so the currency looks the
 * same everywhere. Phaser text can't hold pictures, so a line is split at
 * each leaf into text pieces and leaf images, laid out left to right. Lines
 * ("\n") stack. Positioned like text with an origin: (x, y) is the point
 * `anchorX`/`anchorY` of the whole block lands on.
 */
export class LeafText extends Phaser.GameObjects.Container {
  private text = '';
  /** The block's size after the last setText(). */
  blockWidth = 0;
  blockHeight = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    text: string,
    private readonly style: Phaser.Types.GameObjects.Text.TextStyle,
    private readonly anchorX = 0,
    private readonly anchorY = 0,
    /** For multi-line text: 'left', 'center' or 'right'. */
    private readonly align: 'left' | 'center' | 'right' = 'left',
  ) {
    super(scene, x, y);
    scene.add.existing(this);
    this.setText(text);
  }

  setText(text: string): this {
    if (text === this.text && this.list.length > 0) return this;
    this.text = text;
    this.removeAll(true);
    const lines = text.split('\n').map((line) => this.buildLine(line));
    this.blockWidth = Math.max(0, ...lines.map((l) => l.width));
    // Extra space between lines, as Phaser text's own lineSpacing.
    const gap = Number(this.style.lineSpacing ?? 0);
    this.blockHeight = lines.reduce((sum, l) => sum + l.height, 0) + gap * (lines.length - 1);
    let y = -this.anchorY * this.blockHeight;
    for (const line of lines) {
      const free = this.blockWidth - line.width;
      const x = -this.anchorX * this.blockWidth + (this.align === 'center' ? free / 2 : this.align === 'right' ? free : 0);
      for (const part of line.parts) part.setPosition(part.x + x, y + line.height / 2);
      y += line.height + gap;
    }
    return this;
  }

  /** One line's pieces, laid out from x = 0, vertically centred on y = 0. */
  private buildLine(line: string): { parts: (Phaser.GameObjects.Text | Phaser.GameObjects.Image)[]; width: number; height: number } {
    const parts: (Phaser.GameObjects.Text | Phaser.GameObjects.Image)[] = [];
    // An empty line still takes a line's height.
    const sample = this.scene.add.text(0, 0, 'A', this.style);
    const height = sample.height;
    sample.destroy();
    let x = 0;
    line.split(LEAF).forEach((piece, i) => {
      if (i > 0) {
        const leaf = addArt(this.scene, x, 0, 'leaf').setOrigin(0, 0.5);
        parts.push(leaf);
        x += leaf.displayWidth;
      }
      if (piece) {
        const text = this.scene.add.text(x, 0, piece, this.style).setOrigin(0, 0.5);
        parts.push(text);
        x += text.width;
      }
    });
    this.add(parts);
    return { parts, width: x, height };
  }
}
