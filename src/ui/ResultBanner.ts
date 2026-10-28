import Phaser from 'phaser';
import { BASE_HEIGHT, BASE_WIDTH } from '../config/display';
import type { Score } from '../logic/types';
import { COLORS, TEXT } from './theme';

const RESULT_STYLE: Record<Score, { title: string; subtitle: string; color: number }> = {
  perfect: { title: 'Perfect!', subtitle: 'Exactly what they wanted.', color: COLORS.perfect },
  close: { title: 'Close!', subtitle: 'One thing was off.', color: COLORS.close },
  wrong: { title: 'Wrong...', subtitle: "That's not what they ordered.", color: COLORS.wrong },
};

/** Full-screen result popup shown after serving. Hidden until show(). */
export class ResultBanner extends Phaser.GameObjects.Container {
  private readonly panel: Phaser.GameObjects.Rectangle;
  private readonly title: Phaser.GameObjects.Text;
  private readonly subtitle: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    super(scene, BASE_WIDTH / 2, BASE_HEIGHT / 2);

    // Dim everything behind the banner so the result is the clear focus.
    const dim = scene.add.rectangle(0, 0, BASE_WIDTH, BASE_HEIGHT, COLORS.overlay, 0.45);
    this.panel = scene.add.rectangle(0, 0, 320, 96, COLORS.perfect).setStrokeStyle(3, COLORS.ink);
    this.title = scene.add.text(0, -14, '', TEXT.banner).setOrigin(0.5);
    this.subtitle = scene.add.text(0, 22, '', { ...TEXT.body, color: '#ffffff' }).setOrigin(0.5);

    this.add([dim, this.panel, this.title, this.subtitle]);
    this.setVisible(false);
    // Draw above everything else in the scene.
    this.setDepth(100);
    scene.add.existing(this);
  }

  show(score: Score): void {
    const style = RESULT_STYLE[score];
    this.panel.setFillStyle(style.color);
    this.title.setText(style.title);
    this.subtitle.setText(style.subtitle);
    this.setVisible(true);
  }

  hide(): void {
    this.setVisible(false);
  }
}
